import { EqBand } from './scn-parser';

const FS = 48000; // sample rate

/** Logarithmically spaced frequencies 20Hz–20kHz */
export function logFreqs(count = 200): number[] {
  const lo = Math.log10(20), hi = Math.log10(20000);
  return Array.from({ length: count }, (_, i) => Math.pow(10, lo + (hi - lo) * i / (count - 1)));
}

/** Compute biquad coefficients for a given band */
function biquadCoeffs(band: EqBand): [number, number, number, number, number, number] | null {
  const { type, freq, gain, q } = band;
  if (!isFinite(freq) || freq <= 0) return null;

  const A = Math.pow(10, gain / 40);
  const w0 = 2 * Math.PI * freq / FS;
  const cosW = Math.cos(w0);
  const sinW = Math.sin(w0);
  const Q = Math.max(q, 0.1);

  switch (type) {
    case 'PEQ':
    case 'VEQ': {
      const alpha = sinW / (2 * Q);
      return [
        1 + alpha * A,
        -2 * cosW,
        1 - alpha * A,
        1 + alpha / A,
        -2 * cosW,
        1 - alpha / A,
      ];
    }
    case 'LShv': {
      const alpha = sinW / 2 * Math.sqrt((A + 1 / A) * (1 / Q - 1) + 2);
      const sqA2 = 2 * Math.sqrt(A) * alpha;
      return [
        A * ((A + 1) - (A - 1) * cosW + sqA2),
        2 * A * ((A - 1) - (A + 1) * cosW),
        A * ((A + 1) - (A - 1) * cosW - sqA2),
        (A + 1) + (A - 1) * cosW + sqA2,
        -2 * ((A - 1) + (A + 1) * cosW),
        (A + 1) + (A - 1) * cosW - sqA2,
      ];
    }
    case 'HShv': {
      const alpha = sinW / 2 * Math.sqrt((A + 1 / A) * (1 / Q - 1) + 2);
      const sqA2 = 2 * Math.sqrt(A) * alpha;
      return [
        A * ((A + 1) + (A - 1) * cosW + sqA2),
        -2 * A * ((A - 1) + (A + 1) * cosW),
        A * ((A + 1) + (A - 1) * cosW - sqA2),
        (A + 1) - (A - 1) * cosW + sqA2,
        2 * ((A - 1) - (A + 1) * cosW),
        (A + 1) - (A - 1) * cosW - sqA2,
      ];
    }
    case 'LCut': {
      // High-pass filter
      const alpha = sinW / (2 * Q);
      return [
        (1 + cosW) / 2,
        -(1 + cosW),
        (1 + cosW) / 2,
        1 + alpha,
        -2 * cosW,
        1 - alpha,
      ];
    }
    case 'HCut': {
      // Low-pass filter
      const alpha = sinW / (2 * Q);
      return [
        (1 - cosW) / 2,
        1 - cosW,
        (1 - cosW) / 2,
        1 + alpha,
        -2 * cosW,
        1 - alpha,
      ];
    }
    default:
      return null;
  }
}

/** Response of a single biquad at frequency f in dB */
function biquadResponseDb(coeffs: [number, number, number, number, number, number], f: number): number {
  const [b0, b1, b2, a0, a1, a2] = coeffs;
  const w = 2 * Math.PI * f / FS;
  const cosW = Math.cos(w), sinW = Math.sin(w);
  const cos2W = Math.cos(2 * w), sin2W = Math.sin(2 * w);

  const nR = b0 + b1 * cosW + b2 * cos2W;
  const nI = -(b1 * sinW + b2 * sin2W);
  const dR = a0 + a1 * cosW + a2 * cos2W;
  const dI = -(a1 * sinW + a2 * sin2W);

  const num2 = nR * nR + nI * nI;
  const den2 = dR * dR + dI * dI;
  if (den2 === 0) return 0;
  return 10 * Math.log10(num2 / den2);
}

/** Compute combined EQ response curve for a set of PEQ bands */
export function computeEqCurve(bands: EqBand[], freqs: number[]): number[] {
  const validCoeffs = bands
    .map(b => biquadCoeffs(b))
    .filter((c): c is [number, number, number, number, number, number] => c !== null);

  return freqs.map(f => validCoeffs.reduce((sum, c) => sum + biquadResponseDb(c, f), 0));
}

/** GEQ 31-band frequencies (1/3 octave, standard) */
export const GEQ_FREQS = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160,
  200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600,
  2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000,
];

/** Approximate GEQ response on log freqs using narrow Gaussian per band */
export function computeGeqCurve(geqBands: number[], freqs: number[]): number[] {
  return freqs.map(f => {
    let total = 0;
    for (let i = 0; i < geqBands.length && i < GEQ_FREQS.length; i++) {
      if (geqBands[i] === 0) continue;
      const lf = Math.log10(f);
      const lfc = Math.log10(GEQ_FREQS[i]);
      const sigma = 0.065; // ~1/3 octave width
      total += geqBands[i] * Math.exp(-((lf - lfc) ** 2) / (2 * sigma * sigma));
    }
    return total;
  });
}

/** Format frequency for display: 62 → "62", 1300 → "1.3k", 10020 → "10k" */
export function fmtFreq(f: number): string {
  if (f >= 1000) return `${+(f / 1000).toPrecision(2)}k`;
  return `${Math.round(f)}`;
}
