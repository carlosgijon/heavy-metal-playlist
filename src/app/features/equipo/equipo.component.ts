import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroDocumentText } from '@ng-icons/heroicons/outline';

import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import {
  BandMember, Microphone, Instrument, Amplifier, PaEquipment, ChannelEntry,
  ROLE_LABELS, ROLE_EMOJI, STAGE_POSITION_LABELS, StagePosition,
  MIC_TYPE_LABELS, POLAR_LABELS, PA_CATEGORY_LABELS, MIC_USAGE_LABELS,
} from '../../core/models/equipment.model';
import { MembersComponent } from './members/members.component';
import { MicrophonesComponent } from './microphones/microphones.component';
import { InstrumentsComponent } from './instruments/instruments.component';
import { AmplifiersComponent } from './amplifiers/amplifiers.component';
import { PaComponent } from './pa/pa.component';

type EquipoTab = 'members' | 'instruments' | 'amplifiers' | 'microphones' | 'pa';

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
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-2xl font-bold">Equipoboard</h1>
          <p class="text-sm opacity-60">Gestión de equipo técnico y rider</p>
        </div>
        <button class="btn btn-primary gap-2" (click)="generateRider()" [disabled]="generatingPdf">
          <ng-icon name="heroDocumentText" size="18" />
          {{ generatingPdf ? 'Generando...' : 'Exportar Rider PDF' }}
        </button>
      </div>

      <!-- Tabs -->
      <div class="tabs tabs-bordered mb-4">
        @for (tab of tabs; track tab.id) {
          <button class="tab gap-2"
                  [class.tab-active]="activeTab() === tab.id"
                  (click)="activeTab.set(tab.id)">
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
            <app-members [members]="members" [microphones]="microphones" (changed)="reload()" />
          }
          @if (activeTab() === 'microphones') {
            <app-microphones [microphones]="microphones" (changed)="reload()" />
          }
          @if (activeTab() === 'instruments') {
            <app-instruments [instruments]="instruments" [members]="members"
                             [microphones]="microphones" (changed)="reload()" />
          }
          @if (activeTab() === 'amplifiers') {
            <app-amplifiers [amplifiers]="amplifiers" [members]="members" [microphones]="microphones" (changed)="reload()" />
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
    { id: 'members' as EquipoTab,     label: 'Integrantes',  count: () => this.members.length },
    { id: 'instruments' as EquipoTab, label: 'Instrumentos', count: () => this.instruments.length },
    { id: 'amplifiers' as EquipoTab,  label: 'Amplificadores', count: () => this.amplifiers.length },
    { id: 'microphones' as EquipoTab, label: 'Microfonía',   count: () => this.microphones.length },
    { id: 'pa' as EquipoTab,          label: 'PA / Mesa',    count: () => this.paEquipment.length },
  ];

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    try {
      this.loading = true;
      [this.members, this.microphones, this.instruments, this.amplifiers, this.paEquipment] =
        await Promise.all([
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
      guitar:     'icons/instruments/guitar.svg',
      bass:       'icons/instruments/bass.svg',
      drums:      'icons/instruments/drums.svg',
      keyboard:   'icons/instruments/keyboard.svg',
      microphone: 'icons/instruments/microphone.svg',
      amplifier:  'icons/instruments/amplifier.svg',
      note:       'icons/instruments/music-note.svg',
    };
    const result: Record<string, string> = {};
    await Promise.all(Object.entries(files).map(async ([key, path]) => {
      try {
        const r = await fetch(path);
        result[key] = r.ok ? await r.text() : '';
      } catch { result[key] = ''; }
    }));
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
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:0';
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument!;
      doc.open();
      doc.write(html);
      doc.close();
      iframe.contentWindow!.focus();
      iframe.contentWindow!.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    } catch {
      this.toast.danger('Error al generar el rider');
    } finally {
      this.generatingPdf = false;
    }
  }

  // ── Stage Plot SVG (Rough.js) ─────────────────────────────────────────────

  private buildStageSvg(icons: Record<string, string>): string {
    const svgDataUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

    // A4 Landscape — 297mm × 210mm → viewBox 1122 × 794
    const W = 1122, H = 794;
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
    svgEl.setAttribute('width', '297mm');
    svgEl.setAttribute('height', '210mm');
    svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // ── Helpers ──
    const addEl = (tag: string, attrs: Record<string, string | number> = {}): Element => {
      const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
      Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v)));
      svgEl.appendChild(e);
      return e;
    };
    const addText = (x: number, y: number, content: string, attrs: Record<string, string | number> = {}) => {
      const e = addEl('text', { x, y, 'font-family': 'Arial, sans-serif', ...attrs });
      e.textContent = content;
    };
    const addRect = (x: number, y: number, w: number, h: number, attrs: Record<string, string | number> = {}) =>
      addEl('rect', { x, y, width: w, height: h, ...attrs });
    const addImg = (href: string, x: number, y: number, w: number, h: number) => {
      if (!href) return;
      addEl('image', { href: svgDataUri(href), x, y, width: w, height: h });
    };

    // ── White background ──
    addRect(0, 0, W, H, { fill: '#ffffff' });

    // ── Header ──
    const HEADER_H = 72;
    addText(40, 54, 'STAGE PLOT', {
      'font-size': '44', 'font-weight': 'bold', 'fill': '#111',
    });
    addText(312, 38, 'Artista:', { 'font-size': '12', 'fill': '#888' });
    addText(360, 38, 'Blackout', { 'font-size': '12', 'font-weight': 'bold', 'fill': '#111' });
    addEl('line', { x1: 360, y1: 42, x2: 540, y2: 42, stroke: '#bbb', 'stroke-width': '0.8' });
    // Header bottom rule
    addEl('line', { x1: 0, y1: HEADER_H, x2: W, y2: HEADER_H, stroke: '#333', 'stroke-width': '1.5' });

    // ── Stage area ──
    const SX = 40, SY = HEADER_H + 12;
    const SW = W - 80, SH = H - HEADER_H - 52;
    addRect(SX, SY, SW, SH, { fill: '#f2f2f2', stroke: '#333', 'stroke-width': '2', rx: '3' });

    // Upstage / downstage labels
    addText(SX + 14, SY + 20, 'Upstage Right', { 'font-size': '11', 'fill': '#aaa' });
    addText(SX + SW / 2, SY + 20, 'Upstage Center', {
      'font-size': '11', 'fill': '#aaa', 'text-anchor': 'middle',
    });
    addText(SX + SW - 14, SY + 20, 'Upstage Left', {
      'font-size': '11', 'fill': '#aaa', 'text-anchor': 'end',
    });
    addText(SX + SW / 2, SY + SH - 14, 'Audience', {
      'font-size': '13', 'font-weight': 'bold', 'fill': '#666', 'text-anchor': 'middle',
    });
    // Chevron ↓
    const aX = SX + SW / 2, aY = SY + SH - 4;
    const chev = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    chev.setAttribute('d', `M${aX - 10},${aY} L${aX},${aY + 8} L${aX + 10},${aY}`);
    chev.setAttribute('fill', 'none');
    chev.setAttribute('stroke', '#888');
    chev.setAttribute('stroke-width', '2');
    chev.setAttribute('stroke-linecap', 'round');
    chev.setAttribute('stroke-linejoin', 'round');
    svgEl.appendChild(chev);

    // ── Lookup maps ──
    const instByMember = new Map<string, Instrument[]>();
    this.instruments.forEach(i => {
      if (i.memberId) {
        if (!instByMember.has(i.memberId)) instByMember.set(i.memberId, []);
        instByMember.get(i.memberId)!.push(i);
      }
    });
    const ampByMember = new Map<string, Amplifier>();
    this.amplifiers.forEach(a => { if (a.memberId) ampByMember.set(a.memberId, a); });

    // ── Position coordinates (cx, cy) ──
    // Stage right = audience's left = performer's right = our "right" positions
    // Upstage Right label is at left of stage (stage-right from performer perspective)
    const posCoords: Record<string, [number, number]> = {
      'back-right':    [SX + 154,       SY + 108],
      'back-center':   [SX + SW / 2,    SY + 108],
      'back-left':     [SX + SW - 154,  SY + 108],
      'mid-right':     [SX + 154,       SY + SH / 2],
      'mid-center':    [SX + SW / 2,    SY + SH / 2],
      'mid-left':      [SX + SW - 154,  SY + SH / 2],
      'front-right':   [SX + 222,       SY + SH - 118],
      'front-center':  [SX + SW / 2,    SY + SH - 118],
      'front-left':    [SX + SW - 222,  SY + SH - 118],
    };

    const CARD_W = 158, CARD_H = 130;
    const ICON_SZ = 56;

    Object.entries(posCoords).forEach(([pos, [cx, cy]]) => {
      const member = this.members.find(m => m.stagePosition === (pos as StagePosition));
      if (!member) return;

      const cardX = cx - CARD_W / 2;
      const cardY = cy - CARD_H / 2;

      // White card
      addRect(cardX, cardY, CARD_W, CARD_H, {
        fill: '#fff', stroke: '#333', 'stroke-width': '1.5', rx: '6',
      });

      // Instrument icon
      const memberInsts = instByMember.get(member.id) ?? [];
      const primaryType = memberInsts[0]?.type;
      const iconKey = primaryType === 'guitar'   ? 'guitar'
        : primaryType === 'bass'     ? 'bass'
        : primaryType === 'drums'    ? 'drums'
        : primaryType === 'keyboard' ? 'keyboard'
        : member.role === 'vocalist' ? 'microphone'
        : 'note';
      addImg(icons[iconKey] ?? '', cx - ICON_SZ / 2, cardY + 8, ICON_SZ, ICON_SZ);

      // Member name
      const name = member.name.length > 16 ? member.name.slice(0, 15) + '…' : member.name;
      addText(cx, cardY + ICON_SZ + 22, name, {
        'font-size': '13', 'font-weight': 'bold', 'text-anchor': 'middle', 'fill': '#111',
      });

      // Role label
      const roleLabel = primaryType === 'guitar'   ? 'Guitarra'
        : primaryType === 'bass'     ? 'Bajo'
        : primaryType === 'drums'    ? 'Batería'
        : primaryType === 'keyboard' ? 'Teclado'
        : member.role === 'vocalist' ? 'Voz'
        : '';
      if (roleLabel) {
        addText(cx, cardY + ICON_SZ + 36, roleLabel, {
          'font-size': '10', 'fill': '#888', 'text-anchor': 'middle',
        });
      }

      // Amp info (bottom of card)
      const amp = ampByMember.get(member.id);
      if (amp) {
        const ampLabel = [amp.brand, amp.model].filter(Boolean).join(' ') || amp.name;
        const ampShort = ampLabel.length > 20 ? ampLabel.slice(0, 19) + '…' : ampLabel;
        addText(cx, cardY + CARD_H - 8, ampShort, {
          'font-size': '9', 'fill': '#777', 'text-anchor': 'middle',
        });
      }

      // Mic badge (top-right corner)
      const hasMicBadge = (!!member.vocalMicId && member.role !== 'vocalist')
        || memberInsts.some(i => i.micId);
      if (hasMicBadge) {
        addImg(icons['microphone'] ?? '', cardX + CARD_W - 22, cardY + 4, 18, 18);
      }
    });

    return svgEl.outerHTML;
  }

  // ── Rider HTML (3 pages) ──────────────────────────────────────────────────

  private buildRiderHtml(
    channels: ChannelEntry[],
    icons: Record<string, string>,
    stageSvg: string,
  ): string {
    const SVG_MONO   = '<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="none" stroke="#111" stroke-width="2"/><circle cx="8" cy="8" r="2.5" fill="#111"/></svg>';
    const SVG_STEREO = '<svg width="28" height="16" viewBox="0 0 28 16"><circle cx="6" cy="8" r="6" fill="none" stroke="#111" stroke-width="2"/><circle cx="6" cy="8" r="2" fill="#111"/><circle cx="22" cy="8" r="6" fill="none" stroke="#111" stroke-width="2"/><circle cx="22" cy="8" r="2" fill="#111"/></svg>';

    // Lookup maps
    const instByMember = new Map<string, Instrument[]>();
    this.instruments.forEach(i => {
      if (i.memberId) {
        if (!instByMember.has(i.memberId)) instByMember.set(i.memberId, []);
        instByMember.get(i.memberId)!.push(i);
      }
    });
    const ampByMember = new Map<string, Amplifier[]>();
    this.amplifiers.forEach(a => {
      if (a.memberId) {
        if (!ampByMember.has(a.memberId)) ampByMember.set(a.memberId, []);
        ampByMember.get(a.memberId)!.push(a);
      }
    });
    const micById = new Map<string, Microphone>();
    this.microphones.forEach(m => micById.set(m.id, m));

    // Channel list enrichment
    const instByName = new Map<string, Instrument>();
    this.instruments.forEach(i => instByName.set(i.name, i));
    const memberByName = new Map<string, BandMember>();
    this.members.forEach(m => memberByName.set(m.name, m));

    const channelRows = channels.map(ch => {
      const inst = instByName.get(ch.name);
      const member = inst?.memberId
        ? this.members.find(m => m.id === inst.memberId)
        : memberByName.get(ch.name.replace(/^Voz - /, ''));
      const amps = member ? (ampByMember.get(member.id) ?? []) : [];
      const ampText = amps.length
        ? amps.map(a => a.name + (a.wattage ? ' ' + a.wattage + 'W' : '')).join(', ')
        : (ch.notes === 'DI' ? 'DI Box' : '—');
      const mic = ch.micModel
        ? this.microphones.find(m => m.model === ch.micModel || m.name === ch.micModel)
        : undefined;
      const micBrand = mic?.brand ?? '—';
      const monoSvg = ch.monoStereo === 'stereo' ? SVG_STEREO : SVG_MONO;
      return `<tr>
        <td class="ch-num">${ch.channelNumber}</td>
        <td>${ch.name}</td>
        <td>${member?.name ?? '—'}</td>
        <td>${ampText}</td>
        <td>${micBrand}</td>
        <td>${ch.micModel ?? '—'}</td>
        <td>${ch.micType ? (MIC_TYPE_LABELS as Record<string,string>)[ch.micType] ?? ch.micType : '—'}</td>
        <td class="center">${monoSvg}</td>
        <td class="center">${ch.phantomPower ? '<span class="phantom">+48V</span>' : ''}</td>
        <td>${ch.notes ?? ''}</td>
      </tr>`;
    }).join('');

    // Equipment list sections
    const instSection = this.buildEquipSection('Instrumentos', this.instruments.map(i =>
      `${i.name}${i.brand ? ' — ' + [i.brand, i.model].filter(Boolean).join(' ') : ''}`
    ));
    const ampSection = this.buildEquipSection('Amplificadores', this.amplifiers.map(a => {
      const base = `${a.name}${a.wattage ? ' ' + a.wattage + 'W' : ''}${a.brand ? ' — ' + [a.brand, a.model].filter(Boolean).join(' ') : ''}`;
      const cab = a.cabinetBrand || a.speakerConfig
        ? ` (${[a.cabinetBrand, a.speakerConfig ? a.speakerConfig : '', a.speakerBrand, a.speakerModel].filter(Boolean).join(' ')})`
        : '';
      return base + cab;
    }));

    // Microphones: instrument mics + vocal mics (including backup vocalists)
    const allMicItems: string[] = [];
    this.microphones.forEach(m => {
      const usageLabel = m.usage ? ` [${(MIC_USAGE_LABELS as Record<string,string>)[m.usage] ?? m.usage}]` : '';
      allMicItems.push(`${m.name} — ${MIC_TYPE_LABELS[m.type]}${m.phantomPower ? ' (+48V)' : ''}${usageLabel}`);
    });
    // Backup vocalist mics (members with vocalMicId that are not pure vocalists)
    const backupVocalItems: string[] = [];
    this.members
      .filter(m => m.vocalMicId && m.role !== 'vocalist')
      .forEach(m => {
        const mic = micById.get(m.vocalMicId!);
        if (mic) {
          backupVocalItems.push(
            `${m.name} (coros) — ${mic.name}${mic.brand ? ' · ' + [mic.brand, mic.model].filter(Boolean).join(' ') : ''}`
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

    const paGroups = Object.entries(PA_CATEGORY_LABELS).map(([cat, label]) => {
      const items = this.paEquipment.filter(p => p.category === cat);
      if (!items.length) return '';
      return this.buildEquipSection(label, items.map(p => {
        const base = `${p.quantity > 1 ? p.quantity + 'x ' : ''}${p.name}${[p.brand, p.model].filter(Boolean).length ? ' — ' + [p.brand, p.model].filter(Boolean).join(' ') : ''}`;
        const monitor = p.category === 'monitor' && p.monitorType
          ? ` [${p.monitorType === 'iem' ? 'IEM' + (p.iemWireless ? ' inalámbrico' : ' cable') : 'Altavoz'}]`
          : '';
        return base + monitor;
      }));
    }).join('');

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Rider Técnico — Blackout</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; }
  @page { margin: 0; }
  @page stage   { size: A4 landscape; margin: 0; }
  @page content { size: A4 portrait;  margin: 0; }
  .page { page: content; padding: 10mm 12mm; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  h1 { font-size: 20px; font-weight: bold; color: #1a1a1a; margin-bottom: 2px; }
  h2 { font-size: 14px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #111; padding-bottom: 4px; color: #111; }
  .subtitle { color: #666; font-size: 11px; margin-bottom: 8px; }

  /* ── STAGE PAGE — landscape, full bleed ── */
  .page-stage { page: stage; padding: 0; page-break-after: always; }
  .stage-svg-wrap { display: block; line-height: 0; }
  .stage-svg-wrap svg { display: block; }

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

<!-- PAGE 1: STAGE PLOT (landscape A4) -->
<div class="page-stage">
  <div class="stage-svg-wrap">
    ${stageSvg}
  </div>
</div>

<!-- PAGE 2: CHANNEL LIST -->
<div class="page">
  <h1>Rider Técnico — Blackout</h1>
  <p class="subtitle">Lista de Canales (Input List)</p>
  <h2>Canales de Mesa</h2>
  ${channels.length === 0
    ? '<p style="color:#999">Sin canales generados. Asigna micrófonos a instrumentos e integrantes.</p>'
    : `<table>
        <thead>
          <tr>
            <th>Ch</th><th>Fuente</th><th>Integrante</th><th>Amplificador</th>
            <th>Marca Mic</th><th>Modelo Mic</th><th>Tipo Mic</th>
            <th>M/S</th><th>+48V</th><th>Notas</th>
          </tr>
        </thead>
        <tbody>${channelRows}</tbody>
      </table>`
  }
</div>

<!-- PAGE 3: EQUIPMENT LIST -->
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
        ${items.map(i => `<li>${i}</li>`).join('')}
      </ul>
    </div>`;
  }
}
