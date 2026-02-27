import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroDocumentText } from '@ng-icons/heroicons/outline';

import {
  Amplifier,
  BandMember,
  ChannelEntry,
  Instrument,
  MIC_TYPE_LABELS,
  MIC_USAGE_LABELS,
  Microphone,
  PA_CATEGORY_LABELS,
  PaEquipment,
} from '../../core/models/equipment.model';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { AmplifiersComponent } from './amplifiers/amplifiers.component';
import { InstrumentsComponent } from './instruments/instruments.component';
import { MembersComponent } from './members/members.component';
import { MicrophonesComponent } from './microphones/microphones.component';
import { PaComponent } from './pa/pa.component';

type EquipoTab =
  | 'members'
  | 'instruments'
  | 'amplifiers'
  | 'microphones'
  | 'pa';

@Component({
  selector: 'app-equipo',
  standalone: true,
  imports: [
    CommonModule,
    NgIconComponent,
    MembersComponent,
    MicrophonesComponent,
    InstrumentsComponent,
    AmplifiersComponent,
    PaComponent,
  ],
  providers: [provideIcons({ heroDocumentText })],
  template: `
    <div class="p-4 h-full flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold">Equipoboard</h1>
          <p class="text-sm opacity-60">Gestión de equipo técnico y rider</p>
        </div>
        <button
          class="btn btn-primary gap-2"
          (click)="generateRider()"
          [disabled]="generatingPdf"
        >
          <ng-icon name="heroDocumentText" size="18" />
          {{ generatingPdf ? 'Generando...' : 'Exportar Rider PDF' }}
        </button>
      </div>

      <!-- Tabs -->
      <div class="tabs tabs-bordered mb-4">
        @for (tab of tabs; track tab.id) {
          <button
            class="tab gap-2"
            [class.tab-active]="activeTab() === tab.id"
            (click)="activeTab.set(tab.id)"
          >
            {{ tab.label }}
            <span class="badge badge-sm">{{ tab.count() }}</span>
          </button>
        }
      </div>

      <!-- Tab content -->
      <div class="flex-1 overflow-auto">
        @if (loading) {
          <div class="flex justify-center items-center h-32">
            <span class="loading loading-spinner loading-md"></span>
          </div>
        } @else {
          @if (activeTab() === 'members') {
            <app-members
              [members]="members"
              [microphones]="microphones"
              (changed)="reload()"
            />
          }
          @if (activeTab() === 'microphones') {
            <app-microphones
              [microphones]="microphones"
              [members]="members"
              [amplifiers]="amplifiers"
              [instruments]="instruments"
              (changed)="reload()"
            />
          }
          @if (activeTab() === 'instruments') {
            <app-instruments
              [instruments]="instruments"
              [members]="members"
              [amplifiers]="amplifiers"
              [microphones]="microphones"
              (changed)="reload()"
            />
          }
          @if (activeTab() === 'amplifiers') {
            <app-amplifiers
              [amplifiers]="amplifiers"
              [members]="members"
              [instruments]="instruments"
              [microphones]="microphones"
              (changed)="reload()"
            />
          }
          @if (activeTab() === 'pa') {
            <app-pa [paEquipment]="paEquipment" (changed)="reload()" />
          }
        }
      </div>
    </div>
  `,
})
export class EquipoComponent implements OnInit {
  private db = inject(DatabaseService);
  private toast = inject(ToastService);

  activeTab = signal<EquipoTab>('members');
  loading = true;
  generatingPdf = false;

  members: BandMember[] = [];
  microphones: Microphone[] = [];
  instruments: Instrument[] = [];
  amplifiers: Amplifier[] = [];
  paEquipment: PaEquipment[] = [];

  tabs = [
    {
      id: 'members' as EquipoTab,
      label: 'Integrantes',
      count: () => this.members.length,
    },
    {
      id: 'instruments' as EquipoTab,
      label: 'Instrumentos',
      count: () => this.instruments.length,
    },
    {
      id: 'amplifiers' as EquipoTab,
      label: 'Amplificadores',
      count: () => this.amplifiers.length,
    },
    {
      id: 'microphones' as EquipoTab,
      label: 'Microfonía',
      count: () => this.microphones.length,
    },
    {
      id: 'pa' as EquipoTab,
      label: 'PA / Mesa',
      count: () => this.paEquipment.length,
    },
  ];

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    try {
      this.loading = true;
      [
        this.members,
        this.microphones,
        this.instruments,
        this.amplifiers,
        this.paEquipment,
      ] = await Promise.all([
        this.db.getMembers(),
        this.db.getMicrophones(),
        this.db.getInstruments(),
        this.db.getAmplifiers(),
        this.db.getPaEquipment(),
      ]);
    } catch {
      this.toast.danger('Error al cargar datos del equipo');
    } finally {
      this.loading = false;
    }
  }

  // ── PDF Rider ─────────────────────────────────────────────────────────────

  private async loadIcons(): Promise<Record<string, string>> {
    const files: Record<string, string> = {
      guitar: 'icons/instruments/guitar.svg',
      bass: 'icons/instruments/bass_guitar.svg',
      drums: 'icons/instruments/drum.svg',
      keyboard: 'icons/instruments/synth.svg',
      'vocal-mic': 'icons/instruments/vocal_mic.svg',
      'guitar-amp': 'icons/instruments/guitar_amp.svg',
      'bass-amp': 'icons/instruments/bass_amp.svg',
      'amp-mic': 'icons/instruments/amp_mic_ight.svg',
      di: 'icons/instruments/DI.svg',
    };
    const result: Record<string, string> = {};
    await Promise.all(
      Object.entries(files).map(async ([key, path]) => {
        try {
          const r = await fetch(path);
          result[key] = r.ok ? await r.text() : '';
        } catch {
          result[key] = '';
        }
      }),
    );
    return result;
  }

  async generateRider(): Promise<void> {
    this.generatingPdf = true;
    try {
      const [channels, icons] = await Promise.all([
        this.db.generateChannelList(),
        this.loadIcons(),
      ]);
      const stageSvg = this.buildStageSvg(icons);
      const html = this.buildRiderHtml(channels, icons, stageSvg);
      this.printHtml(html);
    } catch {
      this.toast.danger('Error al generar el rider');
    } finally {
      this.generatingPdf = false;
    }
  }

  private printHtml(html: string): void {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.cssText =
      'position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:0;';
    document.body.appendChild(iframe);
    iframe.addEventListener('load', () => {
      URL.revokeObjectURL(url);
      iframe.contentWindow!.focus();
      iframe.contentWindow!.print();
      setTimeout(() => iframe.remove(), 2000);
    });
    iframe.src = url;
  }

  // ── Stage Plot SVG ───────────────────────────────────────────────────────

  private buildStageSvg(icons: Record<string, string>): string {
    const svgDataUri = (s: string) =>
      `data:image/svg+xml,${encodeURIComponent(s)}`;
    const ns = 'http://www.w3.org/2000/svg';
    const W = 800,
      H = 1120;
    const svgEl = document.createElementNS(ns, 'svg') as SVGSVGElement;
    svgEl.setAttribute('width', '210mm');
    svgEl.setAttribute('height', '297mm');
    svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svgEl.setAttribute('xmlns', ns);

    // ── Helpers ──
    const add = (
      tag: string,
      attrs: Record<string, string | number> = {},
      parent: Element | SVGSVGElement = svgEl,
    ): Element => {
      const e = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v)));
      parent.appendChild(e);
      return e;
    };
    const addTxt = (
      x: number,
      y: number,
      content: string,
      attrs: Record<string, string | number> = {},
      parent: Element | SVGSVGElement = svgEl,
    ): void => {
      const e = add(
        'text',
        { x, y, 'font-family': 'Arial, sans-serif', ...attrs },
        parent,
      );
      e.textContent = content;
    };
    const addImg = (
      href: string,
      x: number,
      y: number,
      w: number,
      h: number,
      rot?: number,
      flipY = false,
    ): void => {
      if (!href) return;
      const icx = x + w / 2, icy = y + h / 2;
      if (rot !== undefined || flipY) {
        // flipY reflects around the icon's horizontal centre in screen space:
        //   translate(0, 2*icy) scale(1,-1)  applied after rotation keeps capsule
        //   direction but flips the icon's up/down asymmetry (stereo-pair mirror).
        const transform = flipY
          ? `translate(0, ${2 * icy}) scale(1, -1) rotate(${rot ?? 0}, ${icx}, ${icy})`
          : `rotate(${rot}, ${icx}, ${icy})`;
        const g = add('g', { transform });
        add('image', { href: svgDataUri(href), x, y, width: w, height: h }, g);
      } else {
        add('image', { href: svgDataUri(href), x, y, width: w, height: h });
      }
    };

    // ── White background + caption ──
    add('rect', { x: 0, y: 0, width: W, height: H, fill: '#ffffff' });
    addTxt(W / 2, 17, 'STAGE PLOT  ·  Blackout', {
      'font-size': '9',
      fill: '#c0c0c0',
      'text-anchor': 'middle',
    });

    // ── Stage box ──
    // X = depth: left (FONDO/back) → right (PÚBLICO/front)
    // Y = width: top (Stage Left)  → bottom (Stage Right)
    const SX = 60,
      SY = 28,
      SW = 680,
      SH = 1062;
    add('rect', {
      x: SX,
      y: SY,
      width: SW,
      height: SH,
      fill: '#f2f2f2',
      stroke: '#333',
      'stroke-width': '2',
      rx: '3',
    });

    const div1X = SX + Math.round(SW / 3);
    const div2X = SX + SW - Math.round(SW / 3);
    add('line', {
      x1: div1X,
      y1: SY + 1,
      x2: div1X,
      y2: SY + SH - 1,
      stroke: '#d0d0d0',
      'stroke-width': '1',
      'stroke-dasharray': '5,5',
    });
    add('line', {
      x1: div2X,
      y1: SY + 1,
      x2: div2X,
      y2: SY + SH - 1,
      stroke: '#d0d0d0',
      'stroke-width': '1',
      'stroke-dasharray': '5,5',
    });
    addTxt(SX + 12, SY + 20, 'Stage Left  ▸', {
      'font-size': '10',
      fill: '#c8c8c8',
    });
    addTxt(SX + 12, SY + SH - 7, '◂  Stage Right', {
      'font-size': '10',
      fill: '#c8c8c8',
    });

    const midY = SY + Math.round(SH / 2);
    addTxt(30, midY, 'FONDO', {
      'font-size': '18',
      'font-weight': 'bold',
      fill: '#555',
      'text-anchor': 'middle',
      transform: `rotate(-90, 30, ${midY})`,
    });
    addTxt(W - 30, midY, 'PÚBLICO', {
      'font-size': '18',
      'font-weight': 'bold',
      fill: '#555',
      'text-anchor': 'middle',
      transform: `rotate(-90, ${W - 30}, ${midY})`,
    });

    // ── Position grid ──
    const cx_back = SX + Math.round(SW / 6);
    const cx_mid = SX + Math.round(SW / 2);
    const cx_front = SX + SW - Math.round(SW / 6);
    const cy_top = SY + Math.round(SH / 6);
    const cy_center = SY + Math.round(SH / 2);
    const cy_bottom = SY + SH - Math.round(SH / 6);
    const posCoords: Record<string, [number, number]> = {
      'back-left': [cx_back, cy_top],
      'back-center': [cx_back, cy_center],
      'back-right': [cx_back, cy_bottom],
      'mid-left': [cx_mid, cy_top],
      'mid-center': [cx_mid, cy_center],
      'mid-right': [cx_mid, cy_bottom],
      'front-left': [cx_front, cy_top],
      'front-center': [cx_front, cy_center],
      'front-right': [cx_front, cy_bottom],
    };

    // ── Icon sizes ──
    const ICON_SZ = 130,
      DRUM_SZ = 190,   // drums are the largest item on stage
      AMP_SZ = 110,
      DI_SZ = 44,
      MIC_SZ = 36;

    // Cable trunk: all signal cables route horizontally to trunkX, then a vertical spine exits rightward
    const trunkX = SX + SW - 22; // near right edge of stage

    const clusterOffsets = (n: number): [number, number][] => {
      if (n === 1) return [[0, 0]];
      if (n === 2)
        return [
          [-90, 0],
          [90, 0],
        ];
      if (n === 3)
        return [
          [-120, 0],
          [0, 0],
          [120, 0],
        ];
      if (n === 4)
        return [
          [-90, -80],
          [90, -80],
          [-90, 80],
          [90, 80],
        ];
      return Array.from(
        { length: n },
        (_, i) =>
          [((i % 3) - 1) * 130, Math.floor(i / 3) * 130] as [number, number],
      );
    };

    const drawChip = (cx: number, cy: number, label: string): void => {
      const clipped = label.length > 14 ? label.slice(0, 13) + '…' : label;
      const chipW = Math.min(clipped.length * 6 + 14, 110);
      const g = add('g', { transform: `rotate(-90, ${cx}, ${cy})` });
      add(
        'rect',
        {
          x: cx - chipW / 2,
          y: cy - 7,
          width: chipW,
          height: 14,
          rx: '6',
          fill: '#333',
        },
        g,
      );
      const t = add(
        'text',
        {
          x: cx,
          y: cy + 4,
          'font-family': 'Arial, sans-serif',
          'font-size': '10',
          'text-anchor': 'middle',
          fill: '#fff',
        },
        g,
      );
      t.textContent = clipped;
    };

    // ── Lookup maps ──
    const memberMap = new Map(this.members.map((m) => [m.id, m]));
    const instSlots = new Map<string, [number, number]>();
    const ampSlots = new Map<string, [number, number]>();

    // ── Phase 0: Compute slot positions ──
    type SlotItem =
      | { kind: 'inst'; inst: Instrument; member: BandMember }
      | { kind: 'vocal'; member: BandMember };
    const slotsByPos = new Map<string, SlotItem[]>();
    this.instruments.forEach((inst) => {
      const member = inst.memberId ? memberMap.get(inst.memberId) : undefined;
      if (!member?.stagePosition) return;
      const arr = slotsByPos.get(member.stagePosition) ?? [];
      arr.push({ kind: 'inst', inst, member });
      slotsByPos.set(member.stagePosition, arr);
    });
    this.members.forEach((member) => {
      if (!member.stagePosition || !member.vocalMicId) return;
      if (this.instruments.some((i) => i.memberId === member.id)) return;
      const arr = slotsByPos.get(member.stagePosition) ?? [];
      arr.push({ kind: 'vocal', member });
      slotsByPos.set(member.stagePosition, arr);
    });
    slotsByPos.forEach((slots, pos) => {
      const base = posCoords[pos];
      if (!base) return;
      const offsets = clusterOffsets(slots.length);
      slots.forEach((slot, idx) => {
        if (slot.kind === 'inst')
          instSlots.set(slot.inst.id, [
            base[0] + offsets[idx][0],
            base[1] + offsets[idx][1],
          ]);
      });
    });
    const ampsByPos = new Map<string, Amplifier[]>();
    this.amplifiers.forEach((amp) => {
      if (!amp.stagePosition) return;
      const arr = ampsByPos.get(amp.stagePosition) ?? [];
      arr.push(amp);
      ampsByPos.set(amp.stagePosition, arr);
    });
    ampsByPos.forEach((amps, pos) => {
      const base = posCoords[pos];
      if (!base) return;
      const offsets = clusterOffsets(amps.length);
      amps.forEach((amp, idx) =>
        ampSlots.set(amp.id, [
          base[0] + offsets[idx][0],
          base[1] + offsets[idx][1],
        ]),
      );
    });

    // ── Precompute drum mic positions (ALL on right side, alternating below/above center) ──
    // Even index → below drum centre; odd index → above drum centre (mirrored icon).
    const drumMicSlots: Array<{ micCX: number; micCY: number; drumCX: number; flipY: boolean }> = [];
    this.instruments.forEach((inst) => {
      if (inst.type !== 'drums') return;
      const slot = instSlots.get(inst.id);
      if (!slot) return;
      const [dx, dy] = slot;
      const assignedMics = this.microphones.filter(
        (m) => m.assignedToType === 'instrument' && m.assignedToId === inst.id,
      );
      assignedMics.forEach((_, micIdx) => {
        const pairIdx = Math.floor(micIdx / 2);
        const isAbove = micIdx % 2 === 1; // even → below, odd → above
        const baseVOffset = DRUM_SZ / 3;
        const extraVOffset = pairIdx * 45;
        const micCY = isAbove
          ? dy - baseVOffset - extraVOffset
          : dy + baseVOffset + extraVOffset;
        const micCX = dx + DRUM_SZ / 2 + MIC_SZ / 2 + 4; // always on right side
        drumMicSlots.push({ micCX, micCY, drumCX: dx, flipY: isAbove });
      });
    });

    // ── PRE-DRAW: All cables (drawn BEFORE icons so icons render on top) ──

    // Instrument→amp cables: dashed gray (signal going to physical amp)
    const ampCableAttrs: Record<string, string | number> = {
      fill: 'none',
      stroke: '#777',
      'stroke-width': '1.5',
      'stroke-dasharray': '6,3',
    };
    // To-mesa cables: solid black (signal going to mixing desk)
    const mesaCableAttrs: Record<string, string | number> = {
      fill: 'none',
      stroke: '#111',
      'stroke-width': '1.5',
    };

    // Instrument→amp cables: smooth cubic bezier curve (dashed gray)
    this.instruments.forEach((inst) => {
      if (inst.routing !== 'amp' || !inst.ampId) return;
      const iSlot = instSlots.get(inst.id);
      const aSlot = ampSlots.get(inst.ampId);
      if (!iSlot || !aSlot) return;
      const [ix, iy] = iSlot,
        [ax, ay] = aSlot;
      const startX = ix + ICON_SZ / 2, startY = iy;
      const endX = ax, endY = ay - AMP_SZ / 2;
      // Cubic bezier: horizontal tangent from instrument right, vertical tangent into amp top
      const ctrl = Math.max(Math.abs(endX - startX), Math.abs(endY - startY)) * 0.5 + 60;
      add('path', {
        d: `M ${startX},${startY} C ${startX + ctrl},${startY} ${endX},${endY - ctrl} ${endX},${endY}`,
        ...ampCableAttrs,
      });
    });

    // Instrument to-mesa cables: solid black L-shape converging at Mesa exit point
    this.instruments.forEach((inst) => {
      if (inst.type === 'drums' || inst.routing === 'amp') return;
      const slot = instSlots.get(inst.id);
      if (!slot) return;
      const [cx, cy] = slot;
      // When routing='di', cable starts after the DI box; for 'mesa', from icon right
      const startX =
        inst.routing === 'di' ? cx + ICON_SZ / 2 + 6 + DI_SZ : cx + ICON_SZ / 2;
      // Right-angle: horizontal to trunk column, then vertical to Mesa exit
      add('polyline', {
        points: `${startX},${cy} ${trunkX},${cy} ${trunkX},${cy_center}`,
        ...mesaCableAttrs,
      });
    });

    // Amplifier to-mesa cables: solid black L-shape converging at Mesa exit point
    this.amplifiers.forEach((amp) => {
      const slot = ampSlots.get(amp.id);
      if (!slot) return;
      const [ax, ay] = slot;
      let sourceX: number, sourceY: number;
      if (amp.routing === 'mic') {
        const micCX = ax + AMP_SZ / 2 + MIC_SZ / 2 + 2;
        sourceX = micCX + MIC_SZ / 2;
        sourceY = ay + AMP_SZ / 3;
      } else {
        sourceX = ax + AMP_SZ / 2;
        sourceY = ay;
      }
      add('polyline', {
        points: `${sourceX},${sourceY} ${trunkX},${sourceY} ${trunkX},${cy_center}`,
        ...mesaCableAttrs,
      });
    });

    // Drum mic cables: all on right side — short line drum right face → mic, then L-shape to mesa
    drumMicSlots.forEach(({ micCX, micCY, drumCX }) => {
      // Short line: drum right face → mic capsule
      add('line', { x1: drumCX + DRUM_SZ / 2, y1: micCY, x2: micCX - MIC_SZ / 2, y2: micCY, stroke: '#111', 'stroke-width': '1.5' });
      // Cable: mic base (right end) → trunk → center
      add('polyline', { points: `${micCX + MIC_SZ / 2},${micCY} ${trunkX},${micCY} ${trunkX},${cy_center}`, ...mesaCableAttrs });
    });

    // ── Mesa exit arrow (always drawn at center-right of stage) ──
    add('line', {
      x1: trunkX,
      y1: cy_center,
      x2: SX + SW - 4,
      y2: cy_center,
      stroke: '#111',
      'stroke-width': '3',
    });
    add('polygon', {
      points: `${SX + SW},${cy_center} ${SX + SW - 10},${cy_center - 5} ${SX + SW - 10},${cy_center + 5}`,
      fill: '#111',
    });
    const lbl = add('text', {
      x: trunkX - 4,
      y: cy_center - 6,
      'font-family': 'Arial, sans-serif',
      'font-size': '8',
      fill: '#111',
      'font-weight': 'bold',
      'text-anchor': 'end',
    });
    lbl.textContent = 'Mesa →';

    // ── Pass 1: Instrument icons + name chips ──
    slotsByPos.forEach((slots, pos) => {
      const base = posCoords[pos];
      if (!base) return;
      const offsets = clusterOffsets(slots.length);
      slots.forEach((slot, idx) => {
        const sx = base[0] + offsets[idx][0],
          sy = base[1] + offsets[idx][1];
        const instIconMap: Record<string, string> = {
          guitar: 'guitar',
          bass: 'bass',
          drums: 'drums',
          keyboard: 'keyboard',
        };
        const icoKey =
          slot.kind === 'inst'
            ? (instIconMap[slot.inst.type] ?? 'guitar')
            : 'vocal-mic';
        const icoSvg = icons[icoKey] ?? '';
        const isDrum = slot.kind === 'inst' && slot.inst.type === 'drums';
        const sz = isDrum ? DRUM_SZ : ICON_SZ;
        if (icoSvg)
          addImg(icoSvg, sx - sz / 2, sy - sz / 2, sz, sz, -90);
        drawChip(sx - sz / 2 - 11, sy, slot.member.name);
      });
    });

    // ── Pass 2: Amplifier icons + chips ──
    ampsByPos.forEach((amps, pos) => {
      const base = posCoords[pos];
      if (!base) return;
      const offsets = clusterOffsets(amps.length);
      amps.forEach((amp, idx) => {
        const ax = base[0] + offsets[idx][0],
          ay = base[1] + offsets[idx][1];
        const ampSvg =
          icons[amp.type === 'bass' ? 'bass-amp' : 'guitar-amp'] ?? '';
        if (ampSvg)
          addImg(ampSvg, ax - AMP_SZ / 2, ay - AMP_SZ / 2, AMP_SZ, AMP_SZ, -90);
        const owner = amp.memberId ? memberMap.get(amp.memberId) : undefined;
        drawChip(
          ax - AMP_SZ / 2 - 11,
          ay,
          owner ? owner.name.split(' ')[0] + ' amp' : amp.name,
        );
      });
    });

    // ── Pass 3: DI box to the RIGHT of instruments, rotated +90° ──
    this.instruments.forEach((inst) => {
      if (inst.type === 'drums' || inst.routing !== 'di') return;
      const slot = instSlots.get(inst.id);
      if (!slot) return;
      const [cx, cy] = slot;
      const diSvg = icons['di'] ?? '';
      const diX = cx + ICON_SZ / 2 + 6; // left edge of DI icon
      // Short connecting line from instrument right edge to DI box
      add('line', {
        x1: cx + ICON_SZ / 2,
        y1: cy,
        x2: diX,
        y2: cy,
        stroke: '#111',
        'stroke-width': '1.5',
      });
      if (diSvg) addImg(diSvg, diX, cy - DI_SZ / 2, DI_SZ, DI_SZ, 90);
    });

    // ── Pass 4: Amp mic — to the right of amp (enfrente), rotated -90° ──
    this.amplifiers.forEach((amp) => {
      const hasMic = this.microphones.some(m => m.assignedToType === 'amplifier' && m.assignedToId === amp.id);
      if (amp.routing !== 'mic' || !hasMic) return;
      const slot = ampSlots.get(amp.id);
      if (!slot) return;
      const [ax, ay] = slot;
      const micSvg = icons['amp-mic'] || icons['vocal-mic'] || '';
      // Mic capsule points left (at amp speakers), base sticks out right ("por fuera")
      const micCX = ax + AMP_SZ / 2 + MIC_SZ / 2 + 2;
      const micCY = ay + AMP_SZ / 3;
      // Short horizontal line from amp right face to mic capsule
      add('line', {
        x1: ax + AMP_SZ / 2,
        y1: micCY,
        x2: micCX - MIC_SZ / 2,
        y2: micCY,
        stroke: '#111',
        'stroke-width': '1.5',
      });
      if (micSvg)
        addImg(
          micSvg,
          micCX - MIC_SZ / 2,
          micCY - MIC_SZ / 2,
          MIC_SZ,
          MIC_SZ,
          -90,
        );
    });

    // ── Pass 5: Drum mic icons (all on right side, -90°; above-centre ones get flipY for mirror effect) ──
    const drumMicSvg = icons['amp-mic'] || icons['vocal-mic'] || '';
    if (drumMicSvg) {
      drumMicSlots.forEach(({ micCX, micCY, flipY }) => {
        addImg(drumMicSvg, micCX - MIC_SZ / 2, micCY - MIC_SZ / 2, MIC_SZ, MIC_SZ, -90, flipY);
      });
    }

    return svgEl.outerHTML;
  }

  // ── Rider HTML (4 pages: cover + stage plot + channels + equipment) ────────

  private buildRiderHtml(
    channels: ChannelEntry[],
    icons: Record<string, string>,
    stageSvg: string,
  ): string {
    const SVG_MONO =
      '<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="none" stroke="#111" stroke-width="2"/><circle cx="8" cy="8" r="2.5" fill="#111"/></svg>';
    const SVG_STEREO =
      '<svg width="28" height="16" viewBox="0 0 28 16"><circle cx="6" cy="8" r="6" fill="none" stroke="#111" stroke-width="2"/><circle cx="6" cy="8" r="2" fill="#111"/><circle cx="22" cy="8" r="6" fill="none" stroke="#111" stroke-width="2"/><circle cx="22" cy="8" r="2" fill="#111"/></svg>';

    // Lookup maps
    const ampByMember = new Map<string, Amplifier[]>();
    this.amplifiers.forEach((a) => {
      if (a.memberId) {
        if (!ampByMember.has(a.memberId)) ampByMember.set(a.memberId, []);
        ampByMember.get(a.memberId)!.push(a);
      }
    });
    const micById = new Map<string, Microphone>();
    this.microphones.forEach((m) => micById.set(m.id, m));

    const channelRows = channels
      .map((ch) => {
        const member = ch.memberId
          ? this.members.find((m) => m.id === ch.memberId)
          : undefined;
        const amps = member ? (ampByMember.get(member.id) ?? []) : [];
        const ampText = amps.length
          ? amps
              .map((a) => a.name + (a.wattage ? ' ' + a.wattage + 'W' : ''))
              .join(', ')
          : ch.notes === 'DI'
            ? 'DI Box'
            : '—';
        const mic = ch.micModel
          ? this.microphones.find(
              (m) => m.model === ch.micModel || m.name === ch.micModel,
            )
          : undefined;
        const micBrand = mic?.brand ?? '—';
        const monoSvg = ch.monoStereo === 'stereo' ? SVG_STEREO : SVG_MONO;
        return `<tr>
        <td class="ch-num">${ch.channelNumber}</td>
        <td>${member?.name ?? '—'}</td>
        <td>${ampText}</td>
        <td>${ch.name}</td>
        <td>${micBrand}</td>
        <td>${ch.micModel ?? '—'}</td>
        <td>${ch.micType ? ((MIC_TYPE_LABELS as Record<string, string>)[ch.micType] ?? ch.micType) : '—'}</td>
        <td class="center">${monoSvg}</td>
        <td class="center">${ch.phantomPower ? '<span class="phantom">+48V</span>' : ''}</td>
        <td>${ch.notes ?? ''}</td>
      </tr>`;
      })
      .join('');

    // Equipment list sections
    const instSection = this.buildEquipSection(
      'Instrumentos',
      this.instruments.map(
        (i) =>
          `${i.name}${i.brand ? ' — ' + [i.brand, i.model].filter(Boolean).join(' ') : ''}`,
      ),
    );
    const ampSection = this.buildEquipSection(
      'Amplificadores',
      this.amplifiers.map((a) => {
        const base = `${a.name}${a.wattage ? ' ' + a.wattage + 'W' : ''}${a.brand ? ' — ' + [a.brand, a.model].filter(Boolean).join(' ') : ''}`;
        const cab =
          a.cabinetBrand || a.speakerConfig
            ? ` (${[a.cabinetBrand, a.speakerConfig ? a.speakerConfig : '', a.speakerBrand, a.speakerModel].filter(Boolean).join(' ')})`
            : '';
        return base + cab;
      }),
    );

    // Microphones: instrument mics + vocal mics (including backup vocalists)
    const allMicItems: string[] = [];
    this.microphones.forEach((m) => {
      const usageLabel = m.usage
        ? ` [${(MIC_USAGE_LABELS as Record<string, string>)[m.usage] ?? m.usage}]`
        : '';
      allMicItems.push(
        `${m.name} — ${MIC_TYPE_LABELS[m.type]}${m.phantomPower ? ' (+48V)' : ''}${usageLabel}`,
      );
    });
    // Backup vocalist mics (members with vocalMicId that are not pure vocalists)
    const backupVocalItems: string[] = [];
    this.members
      .filter((m) => m.vocalMicId && !m.roles.includes('vocalist'))
      .forEach((m) => {
        const mic = micById.get(m.vocalMicId!);
        if (mic) {
          backupVocalItems.push(
            `${m.name} (coros) — ${mic.name}${mic.brand ? ' · ' + [mic.brand, mic.model].filter(Boolean).join(' ') : ''}`,
          );
        }
      });
    const micSection = this.buildEquipSection(
      'Microfonía',
      allMicItems.length ? allMicItems : [],
    );
    const backupSection = backupVocalItems.length
      ? this.buildEquipSection('Coros / Voces adicionales', backupVocalItems)
      : '';

    const paGroups = Object.entries(PA_CATEGORY_LABELS)
      .map(([cat, label]) => {
        const items = this.paEquipment.filter((p) => p.category === cat);
        if (!items.length) return '';
        return this.buildEquipSection(
          label,
          items.map((p) => {
            const base = `${p.quantity > 1 ? p.quantity + 'x ' : ''}${p.name}${[p.brand, p.model].filter(Boolean).length ? ' — ' + [p.brand, p.model].filter(Boolean).join(' ') : ''}`;
            const monitor =
              p.category === 'monitor' && p.monitorType
                ? ` [${p.monitorType === 'iem' ? 'IEM' + (p.iemWireless ? ' inalámbrico' : ' cable') : 'Altavoz'}]`
                : '';
            return base + monitor;
          }),
        );
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Rider Técnico — Blackout</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; }
  @page { size: A4 portrait; margin: 0; }
  .page { padding: 10mm 12mm; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  h1 { font-size: 20px; font-weight: bold; color: #1a1a1a; margin-bottom: 2px; }
  h2 { font-size: 14px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #555; padding-bottom: 4px; color: #555; }
  .subtitle { color: #666; font-size: 11px; margin-bottom: 8px; }

  /* ── COVER PAGE ── */
  .page-cover {
    padding: 0; page-break-after: always;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 297mm; background: #0a0a0a;
  }
  .cover-band {
    font-family: Arial Black, Arial, sans-serif; font-size: 72px; font-weight: 900;
    color: #fff; letter-spacing: 0.12em; text-transform: uppercase;
    border-bottom: 4px solid #c00; padding-bottom: 16px; margin-bottom: 24px;
  }
  .cover-subtitle {
    font-size: 16px; color: #aaa; letter-spacing: 0.25em; text-transform: uppercase;
    margin-bottom: 8px;
  }
  .cover-date { font-size: 12px; color: #666; letter-spacing: 0.15em; }
  .cover-line { width: 80px; height: 3px; background: #c00; margin: 32px auto 0; }

  /* ── STAGE PAGE — portrait A4, full bleed ── */
  .page-stage { padding: 0; page-break-after: always; }
  .stage-svg-wrap { display: block; line-height: 0; }
  .stage-svg-wrap svg { display: block; width: 100%; height: auto; }

  /* ── CHANNEL LIST ── */
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #1a1a1a; color: #fff; padding: 5px 6px; text-align: left; font-size: 10px; }
  td { padding: 4px 6px; border-bottom: 1px solid #e5e5e5; }
  tr:nth-child(even) td { background: #f8f8f8; }
  .ch-num { font-weight: bold; text-align: center; width: 28px; }
  .center { text-align: center; }
  .phantom { background: #dc2626; color: #fff; padding: 1px 4px; border-radius: 3px; font-size: 8px; font-weight: bold; }

  /* ── EQUIPMENT ── */
  .equip-section { margin-bottom: 14px; }
  .equip-list { list-style: none; }
  .equip-list li { padding: 3px 0; border-bottom: 1px solid #eee; font-size: 10.5px; }
  .equip-list li::before { content: "▸ "; color: #333; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<!-- PAGE 1: COVER -->
<div class="page-cover">
  <div class="cover-band">Blackout</div>
  <div class="cover-subtitle">Rider Técnico</div>
  <div class="cover-date">${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  <div class="cover-line"></div>
</div>

<!-- PAGE 2: STAGE PLOT (portrait A4, full bleed) -->
<div class="page-stage">
  <div class="stage-svg-wrap">
    ${stageSvg}
  </div>
</div>

<!-- PAGE 3: CHANNEL LIST -->
<div class="page">
  <h1>Rider Técnico — Blackout</h1>
  <p class="subtitle">Lista de Canales (Input List)</p>
  <h2>Canales de Mesa</h2>
  ${
    channels.length === 0
      ? '<p style="color:#999">Sin canales generados. Asigna micrófonos a instrumentos e integrantes.</p>'
      : `<table>
        <thead>
          <tr>
            <th>Ch</th><th>Integrante</th><th>Amplificador</th><th>Fuente</th>
            <th>Marca Mic</th><th>Modelo Mic</th><th>Tipo Mic</th>
            <th>M/S</th><th>+48V</th><th>Notas</th>
          </tr>
        </thead>
        <tbody>${channelRows}</tbody>
      </table>`
  }
</div>

<!-- PAGE 4: EQUIPMENT LIST -->
<div class="page">
  <h1>Rider Técnico — Blackout</h1>
  <p class="subtitle">Lista de Equipo</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div>
      ${instSection}
      ${ampSection}
    </div>
    <div>
      ${micSection}
      ${backupSection}
      <div class="equip-section"><h2>PA / Sistema de Sonido</h2>${paGroups}</div>
    </div>
  </div>
</div>

</body>
</html>`;
  }

  private buildEquipSection(title: string, items: string[]): string {
    if (!items.length) return '';
    return `<div class="equip-section">
      <h2>${title}</h2>
      <ul class="equip-list">
        ${items.map((i) => `<li>${i}</li>`).join('')}
      </ul>
    </div>`;
  }
}
