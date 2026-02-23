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
    const svgDataUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

    // A4 portrait content area: 186mm × 277mm (210 - 2×12mm margins, 297 - 2×10mm margins)
    // viewBox proportioned to match: 720 × 1040
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
    svgEl.setAttribute('width', '186mm');
    svgEl.setAttribute('height', '277mm');
    svgEl.setAttribute('viewBox', '0 0 720 1040');
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

    // Layout: title strip (top) + side strips (FONDO/PÚBLICO) + 3×2 grid
    const TITLE_H = 44;
    const STRIP   = 26;
    const TOTAL_W = 720;
    const TOTAL_H = 1040;
    const GRID_Y  = TITLE_H;
    const GRID_H  = TOTAL_H - TITLE_H;   // 996
    const INNER_W = TOTAL_W - STRIP * 2; // 668
    const COL_W   = INNER_W / 2;         // 334
    const ROW_H   = GRID_H / 3;          // 332

    type RowKey = 'left' | 'center' | 'right';
    type ColKey = 'back' | 'front';
    const ROWS: RowKey[] = ['left', 'center', 'right'];
    const COLS: ColKey[] = ['back', 'front'];

    const POS_MAP: Record<RowKey, Record<ColKey, StagePosition>> = {
      left:   { back: 'back-left',   front: 'front-left'   },
      center: { back: 'back-center', front: 'front-center' },
      right:  { back: 'back-right',  front: 'front-right'  },
    };
    const ROW_LABELS: Record<RowKey, string> = { left: 'IZQ', center: 'CTR', right: 'DER' };

    // ── Helpers ──
    const addRect = (x: number, y: number, w: number, h: number, fill: string) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      el.setAttribute('x', String(x)); el.setAttribute('y', String(y));
      el.setAttribute('width', String(w)); el.setAttribute('height', String(h));
      el.setAttribute('fill', fill);
      svgEl.appendChild(el);
    };

    const addText = (x: number, y: number, text: string, attrs: Record<string, string> = {}) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      el.setAttribute('x', String(x)); el.setAttribute('y', String(y));
      el.setAttribute('font-family', 'Arial, sans-serif');
      el.setAttribute('font-size', attrs['font-size'] ?? '12');
      el.setAttribute('fill', attrs['fill'] ?? '#111');
      if (attrs['font-weight'])   el.setAttribute('font-weight', attrs['font-weight']);
      if (attrs['text-anchor'])   el.setAttribute('text-anchor', attrs['text-anchor']);
      if (attrs['letter-spacing']) el.setAttribute('letter-spacing', attrs['letter-spacing']);
      if (attrs['transform'])     el.setAttribute('transform', attrs['transform']);
      el.textContent = text;
      svgEl.appendChild(el);
    };

    const addImage = (svgContent: string, x: number, y: number, w: number, h: number) => {
      if (!svgContent) return;
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      el.setAttribute('href', svgDataUri(svgContent));
      el.setAttribute('x', String(x)); el.setAttribute('y', String(y));
      el.setAttribute('width', String(w)); el.setAttribute('height', String(h));
      svgEl.appendChild(el);
    };

    // ── Title strip ──
    addRect(0, 0, TOTAL_W, TITLE_H, '#1a1a1a');
    addText(TOTAL_W / 2, 17, 'RIDER TÉCNICO — BLACKOUT', {
      'font-size': '14', 'font-weight': 'bold', 'fill': '#fff',
      'text-anchor': 'middle', 'letter-spacing': '3',
    });
    addText(TOTAL_W / 2, 34, 'S T A G E   P L O T', {
      'font-size': '9', 'fill': '#dc2626',
      'text-anchor': 'middle', 'letter-spacing': '5',
    });

    // ── FONDO strip (left) ──
    addRect(0, GRID_Y, STRIP, GRID_H, '#2a2a2a');
    addText(13, GRID_Y + GRID_H / 2, 'FONDO DEL ESCENARIO', {
      'font-size': '8', 'font-weight': 'bold', 'fill': '#fff', 'letter-spacing': '2',
      'text-anchor': 'middle', 'transform': `rotate(-90,13,${GRID_Y + GRID_H / 2})`,
    });

    // ── PÚBLICO strip (right) ──
    addRect(TOTAL_W - STRIP, GRID_Y, STRIP, GRID_H, '#dc2626');
    addText(TOTAL_W - 13, GRID_Y + GRID_H / 2, 'PÚBLICO', {
      'font-size': '8', 'font-weight': 'bold', 'fill': '#fff',
      'text-anchor': 'middle', 'transform': `rotate(90,${TOTAL_W - 13},${GRID_Y + GRID_H / 2})`,
    });

    // ── Stage border + grid lines (Rough.js) ──
    svgEl.appendChild(rc.rectangle(STRIP, GRID_Y, INNER_W, GRID_H, {
      roughness: 1.8, stroke: '#222', strokeWidth: 2.5, fill: 'none',
    }));
    svgEl.appendChild(rc.line(STRIP + COL_W, GRID_Y, STRIP + COL_W, GRID_Y + GRID_H, {
      roughness: 1.2, stroke: '#999', strokeWidth: 1.2,
    }));
    svgEl.appendChild(rc.line(STRIP, GRID_Y + ROW_H, STRIP + INNER_W, GRID_Y + ROW_H, {
      roughness: 1.0, stroke: '#ccc', strokeWidth: 1,
    }));
    svgEl.appendChild(rc.line(STRIP, GRID_Y + ROW_H * 2, STRIP + INNER_W, GRID_Y + ROW_H * 2, {
      roughness: 1.0, stroke: '#ccc', strokeWidth: 1,
    }));

    // Column headers
    addText(STRIP + COL_W / 2,       GRID_Y + 16, 'FONDO',
      { 'font-size': '9', 'fill': '#999', 'text-anchor': 'middle', 'letter-spacing': '1' });
    addText(STRIP + COL_W + COL_W / 2, GRID_Y + 16, 'FRENTE',
      { 'font-size': '9', 'fill': '#999', 'text-anchor': 'middle', 'letter-spacing': '1' });

    // ── Cells ──
    ROWS.forEach((rowKey, ri) => {
      const ry = GRID_Y + ri * ROW_H;

      addText(13, ry + ROW_H / 2 + 5, ROW_LABELS[rowKey], {
        'font-size': '9', 'font-weight': 'bold', 'fill': '#aaa',
        'text-anchor': 'middle', 'transform': `rotate(-90,13,${ry + ROW_H / 2 + 5})`,
      });

      COLS.forEach((colKey, ci) => {
        const cx = STRIP + ci * COL_W;
        const pos = POS_MAP[rowKey][colKey];
        const member = this.members.find(m => m.stagePosition === pos);

        if (!member) {
          addText(cx + COL_W / 2, ry + ROW_H / 2 + 14, '—',
            { 'font-size': '40', 'fill': '#e8e8e8', 'text-anchor': 'middle' });
          return;
        }

        const memberInsts = instByMember.get(member.id) ?? [];
        const primaryType = memberInsts[0]?.type;
        const iconKey = primaryType === 'guitar'   ? 'guitar'
          : primaryType === 'bass'     ? 'bass'
          : primaryType === 'drums'    ? 'drums'
          : primaryType === 'keyboard' ? 'keyboard'
          : member.role === 'vocalist' ? 'microphone'
          : 'note';

        // Large icon — centered, takes up ~40% of row height
        const iconSize = Math.min(ROW_H * 0.40, 120);
        addImage(icons[iconKey] ?? '', cx + COL_W / 2 - iconSize / 2, ry + 30, iconSize, iconSize);

        // Name
        const nameY = ry + 30 + iconSize + 24;
        const nameStr = member.name.length > 20 ? member.name.slice(0, 19) + '…' : member.name;
        addText(cx + COL_W / 2, nameY, nameStr,
          { 'font-size': '17', 'font-weight': 'bold', 'text-anchor': 'middle', 'fill': '#111' });

        // Role
        addText(cx + COL_W / 2, nameY + 22,
          ROLE_LABELS[member.role] ?? member.role,
          { 'font-size': '11', 'fill': '#888', 'text-anchor': 'middle' });

        // Amp
        const amp = ampByMember.get(member.id);
        if (amp) {
          const ampLabel = [amp.brand, amp.model].filter(Boolean).join(' ') || amp.name;
          const ampShort = ampLabel.length > 30 ? ampLabel.slice(0, 29) + '…' : ampLabel;
          addText(cx + COL_W / 2, nameY + 40, ampShort,
            { 'font-size': '10', 'fill': '#777', 'text-anchor': 'middle' });
        }

        // Mic badge (top-right corner)
        const hasMicBadge = (!!member.vocalMicId && member.role !== 'vocalist')
          || memberInsts.some(i => i.micId);
        if (hasMicBadge) {
          addImage(icons['microphone'] ?? '', cx + COL_W - 36, ry + 10, 28, 28);
        }
      });
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
  @page { size: A4 portrait; margin: 10mm 12mm; }
  .page { padding: 0; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  h1 { font-size: 20px; font-weight: bold; color: #1a1a1a; margin-bottom: 2px; }
  h2 { font-size: 14px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #dc2626; padding-bottom: 4px; color: #dc2626; }
  .subtitle { color: #666; font-size: 11px; margin-bottom: 8px; }

  /* ── STAGE PAGE — full bleed SVG ── */
  .page-stage { page-break-after: always; break-after: page; }
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
  .equip-list li::before { content: "▸ "; color: #dc2626; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<!-- PAGE 1: STAGE PLOT (Rough.js SVG — full page) -->
<div class="page-stage">
  <div class="stage-svg-wrap">
    ${stageSvg}
    ${this.members.length === 0 ? '<text x="360" y="550" font-family="Arial" font-size="16" fill="#bbb" text-anchor="middle">Sin integrantes configurados</text>' : ''}
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
