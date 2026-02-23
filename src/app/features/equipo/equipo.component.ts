import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroDocumentText } from '@ng-icons/heroicons/outline';
import rough from 'roughjs';
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

  private printHtml(html: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:0;visibility:hidden';
      document.body.appendChild(iframe);

      const cleanup = () => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      };

      iframe.onload = () => {
        try {
          iframe.contentWindow!.focus();
          iframe.contentWindow!.print();
          setTimeout(() => { cleanup(); resolve(); }, 1500);
        } catch (e) {
          cleanup(); reject(e);
        }
      };
      iframe.onerror = () => { cleanup(); reject(new Error('iframe load error')); };
      iframe.src = url; // triggers onload reliably after full parse
    });
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
      await this.printHtml(html);
    } catch {
      this.toast.danger('Error al generar el rider');
    } finally {
      this.generatingPdf = false;
    }
  }

  // ── Stage Plot SVG (Rough.js) ─────────────────────────────────────────────

  private buildStageSvg(icons: Record<string, string>): string {
    // Safe SVG data URI: works with any Unicode content
    const svgDataUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

    // Create in-memory SVG element for Rough.js
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
    svgEl.setAttribute('width', '752');
    svgEl.setAttribute('height', '490');
    svgEl.setAttribute('viewBox', '0 0 752 490');
    svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const rc = rough.svg(svgEl);

    // Lookup maps
    const instByMember = new Map<string, Instrument[]>();
    this.instruments.forEach(i => {
      if (i.memberId) {
        if (!instByMember.has(i.memberId)) instByMember.set(i.memberId, []);
        instByMember.get(i.memberId)!.push(i);
      }
    });
    const ampByMember = new Map<string, Amplifier>();
    this.amplifiers.forEach(a => { if (a.memberId) ampByMember.set(a.memberId, a); });
    const micById = new Map<string, Microphone>();
    this.microphones.forEach(m => micById.set(m.id, m));

    // Layout constants
    // Grid: 3 rows (IZQ/CENTRO/DER) × 2 cols (FONDO | FRENTE)
    // Left strip 26px = FONDO, right strip 26px = PÚBLICO, inner = 700px
    const STRIP = 26;
    const INNER_W = 752 - STRIP * 2; // 700
    const INNER_H = 490;
    const COL_W = INNER_W / 2;       // 350 each col
    const ROW_H = INNER_H / 3;       // ~163 each row

    // Row positions (visual top-to-bottom = IZQ / CENTRO / DER)
    type RowKey = 'left' | 'center' | 'right';
    const ROWS: RowKey[] = ['left', 'center', 'right'];
    type ColKey = 'back' | 'front';
    const COLS: ColKey[] = ['back', 'front'];

    const POS_MAP: Record<RowKey, Record<ColKey, StagePosition>> = {
      left:   { back: 'back-left',   front: 'front-left'   },
      center: { back: 'back-center', front: 'front-center' },
      right:  { back: 'back-right',  front: 'front-right'  },
    };

    const ROW_LABELS: Record<RowKey, string> = {
      left: 'IZQ', center: 'CTR', right: 'DER',
    };

    // Outer stage border
    svgEl.appendChild(rc.rectangle(STRIP, 0, INNER_W, INNER_H, {
      roughness: 1.8, stroke: '#222', strokeWidth: 2.5, fill: 'none',
    }));

    // Vertical grid divider (col 0 | col 1)
    svgEl.appendChild(rc.line(STRIP + COL_W, 0, STRIP + COL_W, INNER_H, {
      roughness: 1.2, stroke: '#999', strokeWidth: 1.2,
    }));

    // Horizontal row dividers
    svgEl.appendChild(rc.line(STRIP, ROW_H, STRIP + INNER_W, ROW_H, {
      roughness: 1.0, stroke: '#bbb', strokeWidth: 1,
    }));
    svgEl.appendChild(rc.line(STRIP, ROW_H * 2, STRIP + INNER_W, ROW_H * 2, {
      roughness: 1.0, stroke: '#bbb', strokeWidth: 1,
    }));

    // Helper: add SVG text element
    const addText = (
      x: number, y: number, text: string,
      attrs: Record<string, string> = {},
    ) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      el.setAttribute('x', String(x));
      el.setAttribute('y', String(y));
      el.setAttribute('font-family', 'Arial, sans-serif');
      el.setAttribute('font-size', attrs['font-size'] ?? '11');
      el.setAttribute('fill', attrs['fill'] ?? '#111');
      if (attrs['font-weight']) el.setAttribute('font-weight', attrs['font-weight']);
      if (attrs['text-anchor']) el.setAttribute('text-anchor', attrs['text-anchor']);
      if (attrs['opacity']) el.setAttribute('opacity', attrs['opacity']);
      if (attrs['transform']) el.setAttribute('transform', attrs['transform']);
      el.textContent = text;
      svgEl.appendChild(el);
    };

    // Helper: add <image> (SVG as data URI)
    const addImage = (svgContent: string, x: number, y: number, w: number, h: number) => {
      if (!svgContent) return;
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      el.setAttribute('href', svgDataUri(svgContent));
      el.setAttribute('x', String(x));
      el.setAttribute('y', String(y));
      el.setAttribute('width', String(w));
      el.setAttribute('height', String(h));
      svgEl.appendChild(el);
    };

    // Render cells
    ROWS.forEach((rowKey, ri) => {
      const ry = ri * ROW_H;

      // Row label (vertical text on left strip)
      addText(
        13, ry + ROW_H / 2 + 4, ROW_LABELS[rowKey],
        { 'font-size': '8', 'font-weight': 'bold', 'fill': '#555',
          'text-anchor': 'middle', 'transform': `rotate(-90, 13, ${ry + ROW_H / 2 + 4})` },
      );

      COLS.forEach((colKey, ci) => {
        const cx = STRIP + ci * COL_W;
        const pos = POS_MAP[rowKey][colKey];
        const member = this.members.find(m => m.stagePosition === pos);

        if (!member) {
          // Empty cell marker
          addText(cx + COL_W / 2, ry + ROW_H / 2 + 4, '—',
            { 'font-size': '18', 'fill': '#ddd', 'text-anchor': 'middle' });
          return;
        }

        // Determine primary instrument type
        const memberInsts = instByMember.get(member.id) ?? [];
        const primaryType = memberInsts[0]?.type;
        const iconKey = primaryType === 'guitar' ? 'guitar'
          : primaryType === 'bass' ? 'bass'
          : primaryType === 'drums' ? 'drums'
          : primaryType === 'keyboard' ? 'keyboard'
          : member.role === 'vocalist' ? 'microphone'
          : 'note';

        // Instrument icon (centered, top of cell)
        const iconH = Math.min(ROW_H * 0.45, 65);
        const iconW = 50;
        addImage(icons[iconKey] ?? '', cx + COL_W / 2 - iconW / 2, ry + 8, iconW, iconH);

        // Member name
        addText(cx + COL_W / 2, ry + iconH + 18,
          member.name.length > 16 ? member.name.slice(0, 15) + '…' : member.name,
          { 'font-size': '11', 'font-weight': 'bold', 'text-anchor': 'middle', 'fill': '#111' });

        // Amp info (if any)
        const amp = ampByMember.get(member.id);
        if (amp) {
          const ampLabel = [amp.brand, amp.model].filter(Boolean).join(' ') || amp.name;
          const ampShort = ampLabel.length > 22 ? ampLabel.slice(0, 21) + '…' : ampLabel;
          addText(cx + COL_W / 2, ry + iconH + 30,
            ampShort,
            { 'font-size': '8.5', 'fill': '#666', 'text-anchor': 'middle' });
        }

        // Mic icon in top-right corner: show if backup vocalist (has vocalMicId) or has miked instrument
        const hasMicBadge = (!!member.vocalMicId && member.role !== 'vocalist')
          || memberInsts.some(i => i.micId);
        if (hasMicBadge) {
          addImage(icons['microphone'] ?? '', cx + COL_W - 22, ry + 4, 18, 18);
        }
      });
    });

    // FONDO strip (left) — vertical label
    const fondoRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    fondoRect.setAttribute('x', '0');
    fondoRect.setAttribute('y', '0');
    fondoRect.setAttribute('width', String(STRIP));
    fondoRect.setAttribute('height', String(INNER_H));
    fondoRect.setAttribute('fill', '#1a1a1a');
    svgEl.insertBefore(fondoRect, svgEl.firstChild);  // behind Rough.js elements

    addText(13, INNER_H / 2,
      'FONDO DEL ESCENARIO',
      { 'font-size': '7', 'font-weight': 'bold', 'fill': '#fff', 'letter-spacing': '2',
        'text-anchor': 'middle', 'transform': `rotate(-90, 13, ${INNER_H / 2})` });

    // PÚBLICO strip (right) — vertical label
    const pubRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    pubRect.setAttribute('x', String(752 - STRIP));
    pubRect.setAttribute('y', '0');
    pubRect.setAttribute('width', String(STRIP));
    pubRect.setAttribute('height', String(INNER_H));
    pubRect.setAttribute('fill', '#dc2626');
    svgEl.appendChild(pubRect);

    addText(752 - 13, INNER_H / 2,
      'PÚBLICO',
      { 'font-size': '7', 'font-weight': 'bold', 'fill': '#fff',
        'text-anchor': 'middle', 'transform': `rotate(90, ${752 - 13}, ${INNER_H / 2})` });

    // Column header labels at top
    addText(STRIP + COL_W / 2, -5, 'FONDO',
      { 'font-size': '8', 'fill': '#888', 'text-anchor': 'middle' });
    addText(STRIP + COL_W + COL_W / 2, -5, 'FRENTE',
      { 'font-size': '8', 'fill': '#888', 'text-anchor': 'middle' });

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
  @page { size: A4 portrait; margin: 10mm 12mm; }
  .page { padding: 0; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  h1 { font-size: 20px; font-weight: bold; color: #1a1a1a; margin-bottom: 2px; }
  h2 { font-size: 14px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #dc2626; padding-bottom: 4px; color: #dc2626; }
  .subtitle { color: #666; font-size: 11px; margin-bottom: 8px; }

  /* ── STAGE PAGE ── */
  .page-stage { page-break-after: always; }
  .stage-header { padding: 4px 0 8px; display: flex; align-items: baseline; gap: 12px; }
  .stage-header h1 { font-size: 18px; }
  .stage-header .subtitle { margin: 0; }
  .stage-svg-wrap { overflow: visible; }
  .stage-svg-wrap svg { max-width: 100%; height: auto; }

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
  .equip-list li::before { content: "▸ "; color: #dc2626; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<!-- PAGE 1: STAGE PLOT (Rough.js SVG) -->
<div class="page-stage">
  <div class="stage-header">
    <h1>Rider Técnico — Blackout</h1>
    <span class="subtitle">Stage Plot</span>
  </div>
  <div class="stage-svg-wrap">
    ${stageSvg}
  </div>
  ${this.members.length === 0 ? '<p style="padding:12px;color:#999">Sin integrantes configurados</p>' : ''}
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
