export interface EqBand {
  type: string; // PEQ | LShv | HShv | LCut | HCut | VEQ
  freq: number;
  gain: number;
  q: number;
}

export interface ChannelData {
  key: string;
  number: number;
  type: 'ch' | 'bus' | 'lr';
  name: string;
  color: number; // XR18 color index 0-7
  eqEnabled: boolean;
  eqMode: 'PEQ' | 'GEQ';
  eqBands: EqBand[];
  geqBands: number[]; // 31 values for GEQ, empty for PEQ channels
  faderDb: number;
  on: boolean;
  pan: number; // -100..+100
  gateOn: boolean;
  dynOn: boolean;
  dynType: string;
}

export interface ScnData {
  inputChannels: ChannelData[];
  buses: ChannelData[];
  lr: ChannelData | null;
  sceneName: string;
}

// XR18 color index → CSS color
export const XR_COLORS: Record<number, string> = {
  0: '#6b7280',
  1: '#ef4444',
  2: '#eab308',
  3: '#3b82f6',
  4: '#06b6d4',
  5: '#22c55e',
  6: '#a855f7',
  7: '#f9fafb',
  8: '#f97316',
  9: '#ec4899',
  10: '#14b8a6',
  11: '#84cc16',
  12: '#fb923c',
  15: '#8b5cf6',
};

/** Parse "1k30" → 1300, "62.5" → 62.5, "10k02" → 10020 */
function parseFreq(s: string): number {
  if (s.includes('k')) {
    const [intPart, decPart] = s.split('k');
    return parseFloat(intPart + '.' + (decPart || '0')) * 1000;
  }
  return parseFloat(s);
}

function parseDb(s: string): number {
  if (s === '-oo' || s === '-inf' || s === '-Inf') return -Infinity;
  return parseFloat(s);
}

function makeChannel(key: string, num: number, type: 'ch' | 'bus' | 'lr'): ChannelData {
  return {
    key, number: num, type,
    name: type === 'lr' ? 'LR' : `${type === 'ch' ? 'Ch' : 'Bus'} ${String(num).padStart(2, '0')}`,
    color: 0, eqEnabled: true, eqMode: 'PEQ',
    eqBands: [], geqBands: [],
    faderDb: 0, on: true, pan: 0,
    gateOn: false, dynOn: false, dynType: 'COMP',
  };
}

function applyLine(ch: ChannelData, rest: string): void {
  // config "Name" colorIdx ...
  const configM = rest.match(/^config\s+"([^"]*)"\s+(\d+)/);
  if (configM) { if (configM[1]) ch.name = configM[1]; ch.color = parseInt(configM[2]); return; }

  // eq/N [ON|OFF] TYPE FREQ GAIN Q  (per-band line, optional enabled flag)
  const eqBandM = rest.match(/^eq\/(\d+)\s+(?:(?:ON|OFF)\s+)?(\S+)\s+(\S+)\s+([+-]?\S+)\s+(\S+)/);
  if (eqBandM) {
    const freq = parseFreq(eqBandM[3]);
    if (isFinite(freq) && freq > 0) {
      ch.eqBands.push({
        type: eqBandM[2],
        freq,
        gain: parseFloat(eqBandM[4]),
        q:    parseFloat(eqBandM[5]),
      });
    }
    return;
  }

  // eq ... — handles multiple sub-formats on one line:
  //   eq ON|OFF [GEQ|PEQ]          → mode/enable only
  //   eq ON|OFF (0|1) TYPE FREQ GAIN Q ...  → compact with mode prefix
  //   eq (0|1) TYPE FREQ GAIN Q ...         → compact without mode prefix
  if (rest.startsWith('eq ')) {
    const tokens = rest.slice(3).trim().split(/\s+/);
    let idx = 0;

    // Optional ON/OFF (eq enabled)
    if (tokens[idx] === 'ON' || tokens[idx] === 'OFF') {
      ch.eqEnabled = tokens[idx] === 'ON';
      idx++;
    }

    // Optional mode token (GEQ|PEQ)
    if (tokens[idx] === 'GEQ' || tokens[idx] === 'PEQ') {
      if (tokens[idx] === 'GEQ') ch.eqMode = 'GEQ';
      idx++;
    }

    // Compact bands: groups of 5 tokens → (0|1) TYPE FREQ GAIN Q
    if (tokens[idx] === '0' || tokens[idx] === '1') {
      while (idx + 4 < tokens.length) {
        // tokens[idx] = enabled flag (skip)
        const type = tokens[idx + 1];
        const freq = parseFreq(tokens[idx + 2]);
        const gain = parseFloat(tokens[idx + 3]);
        const q    = parseFloat(tokens[idx + 4]);
        if (isFinite(freq) && freq > 0) {
          ch.eqBands.push({ type, freq, gain, q });
        }
        idx += 5;
      }
    }
    return;
  }

  // geq val1 val2 ... (31 values for GEQ buses)
  if (rest.startsWith('geq ')) {
    ch.geqBands = rest.slice(4).trim().split(/\s+/).map(Number);
    return;
  }

  // mix ON fader ON pan  (input channels)
  const mixChM = rest.match(/^mix\s+(ON|OFF)\s+([+-]?[\d.]+|-oo)\s+(ON|OFF)\s+([+-]?\d+)/);
  if (mixChM) {
    ch.on = mixChM[1] === 'ON';
    ch.faderDb = parseDb(mixChM[2]);
    ch.pan = parseInt(mixChM[4]);
    return;
  }

  // mix ON fader pan  (LR)
  const mixLrM = rest.match(/^mix\s+(ON|OFF)\s+([+-]?[\d.]+|-oo)\s+([+-]?\d+)$/);
  if (mixLrM) {
    ch.on = mixLrM[1] === 'ON';
    ch.faderDb = parseDb(mixLrM[2]);
    ch.pan = parseInt(mixLrM[3]);
    return;
  }

  // gate ON/OFF
  const gateM = rest.match(/^gate\s+(ON|OFF)/);
  if (gateM) { ch.gateOn = gateM[1] === 'ON'; return; }

  // dyn ON/OFF TYPE
  const dynM = rest.match(/^dyn\s+(ON|OFF)\s+(\S+)/);
  if (dynM) { ch.dynOn = dynM[1] === 'ON'; ch.dynType = dynM[2]; return; }
}

export function parseScn(text: string, fileName = ''): ScnData {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#'));
  const chMap = new Map<string, ChannelData>();
  const busMap = new Map<string, ChannelData>();
  let lr: ChannelData | null = null;

  for (const line of lines) {
    const chM = line.match(/^\/ch\/(\d+)\/(.+)/);
    if (chM) {
      const n = parseInt(chM[1]);
      const k = `ch_${n}`;
      if (!chMap.has(k)) chMap.set(k, makeChannel(k, n, 'ch'));
      applyLine(chMap.get(k)!, chM[2]);
      continue;
    }

    const busM = line.match(/^\/bus\/(\d+)\/(.+)/);
    if (busM) {
      const n = parseInt(busM[1]);
      const k = `bus_${n}`;
      if (!busMap.has(k)) busMap.set(k, makeChannel(k, n, 'bus'));
      applyLine(busMap.get(k)!, busM[2]);
      continue;
    }

    const lrM = line.match(/^\/lr\/(.+)/);
    if (lrM) {
      if (!lr) lr = makeChannel('lr', 0, 'lr');
      applyLine(lr, lrM[1]);
    }
  }

  return {
    inputChannels: Array.from(chMap.values()).sort((a, b) => a.number - b.number),
    buses: Array.from(busMap.values()).sort((a, b) => a.number - b.number),
    lr,
    sceneName: fileName.replace(/\.scn$/i, ''),
  };
}
