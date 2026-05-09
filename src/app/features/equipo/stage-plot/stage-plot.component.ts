import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragEnd } from '@angular/cdk/drag-drop';
import { StagePlotService } from '../../../core/services/stage-plot.service';
import { DatabaseService } from '../../../core/services/database.service';
import { ToastService } from '../../../core/services/toast.service';

export interface StageItem {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  iconType: 'svg' | 'text';
  iconValue: string;
}

export interface EquipmentCategory {
  id: string;
  title: string;
  items: StageItem[];
  open: boolean;
}

@Component({
  selector: 'app-stage-plot',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './stage-plot.component.html',
  styleUrls: ['./stage-plot.component.scss']
})
export class StagePlotComponent implements OnInit {

  items: StageItem[] = [];
  categories: EquipmentCategory[] = [];
  loading = true;
  saving = false;
  
  selectedItem: StageItem | null = null;

  constructor(
    private stagePlotService: StagePlotService,
    private db: DatabaseService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.loading = true;
    try {
      // 1. Fetch available equipment from db
      const [members, instruments, amps, mics, pa] = await Promise.all([
        this.db.getMembers(),
        this.db.getInstruments(),
        this.db.getAmplifiers(),
        this.db.getMicrophones(),
        this.db.getPaEquipment()
      ]);

      const catMembers: StageItem[] = [];
      const catInstruments: StageItem[] = [];
      const catAmps: StageItem[] = [];
      const catMics: StageItem[] = [];
      const catOthers: StageItem[] = [];

      members.forEach(m => {
        catMembers.push({ 
          id: `member_${m.id}`, type: 'member', label: m.name, 
          x: 0, y: 0, width: 45, height: 45, rotation: 0,
          iconType: 'text', iconValue: m.name.charAt(0).toUpperCase() 
        });
      });

      instruments.forEach(i => {
        const isDrum = i.type === 'drums';
        const isKeys = i.type === 'keyboard';
        const w = isDrum ? 120 : (isKeys ? 100 : 30);
        const h = isDrum ? 120 : (isKeys ? 40 : 80);
        catInstruments.push({ 
          id: `inst_${i.id}`, type: 'instrument', label: i.name, 
          x: 0, y: 0, width: w, height: h, rotation: 0,
          iconType: 'svg', iconValue: this.getSvgForInstrument(i.type) 
        });
      });

      amps.forEach(a => {
        catAmps.push({ 
          id: `amp_${a.id}`, type: 'amp', label: a.name, 
          x: 0, y: 0, width: 50, height: 40, rotation: 0,
          iconType: 'svg', iconValue: this.getSvgForAmp(a.type) 
        });
      });

      mics.forEach(m => {
        catMics.push({
          id: `mic_${m.id}`, type: 'mic', label: m.name + (m.brand ? ` (${m.brand})` : ''),
          x: 0, y: 0, width: 20, height: 20, rotation: 0,
          iconType: 'svg', iconValue: 'icons/instruments/vocal_mic.svg'
        });
      });

      // Monitores u otros PAs
      pa.forEach(p => {
        catOthers.push({
          id: `pa_${p.id}`, type: 'monitor', label: p.name,
          x: 0, y: 0, width: 40, height: 30, rotation: 0,
          iconType: 'svg', iconValue: 'icons/instruments/DI.svg' // TODO: add real monitor SVG if available, fallback to DI for now
        });
      });

      // Generales fijos
      catInstruments.push({ id: 'gen_drum', type: 'drums', label: 'Batería Genérica', x: 0, y: 0, width: 120, height: 120, rotation: 0, iconType: 'svg', iconValue: 'icons/instruments/drum.svg' });
      catMics.push({ id: 'gen_mic1', type: 'mic', label: 'Micrófono Genérico', x: 0, y: 0, width: 20, height: 20, rotation: 0, iconType: 'svg', iconValue: 'icons/instruments/vocal_mic.svg' });
      catOthers.push({ id: 'gen_di', type: 'di', label: 'Caja DI Genérica', x: 0, y: 0, width: 20, height: 20, rotation: 0, iconType: 'svg', iconValue: 'icons/instruments/DI.svg' });

      this.categories = [
        { id: 'members', title: 'Integrantes', items: catMembers, open: true },
        { id: 'instruments', title: 'Instrumentos', items: catInstruments, open: false },
        { id: 'amps', title: 'Amplificadores', items: catAmps, open: false },
        { id: 'mics', title: 'Micrófonos', items: catMics, open: false },
        { id: 'others', title: 'PA y Otros', items: catOthers, open: false },
      ];

      // 2. Fetch saved positions
      this.stagePlotService.getStagePlot().subscribe({
        next: (plot) => {
          if (plot.plotData && plot.plotData !== '[]') {
            try {
              const savedItems: StageItem[] = JSON.parse(plot.plotData);
              // Ensure old items get the new properties (width, height, rotation) if they were missing
              this.items = savedItems.map(si => ({
                ...si,
                width: si.width || 50,
                height: si.height || 50,
                rotation: si.rotation || 0
              }));
            } catch (e) {
              this.items = [];
            }
          }
          this.loading = false;
        },
        error: () => {
          this.toast.danger('Error al cargar Stage Plot');
          this.loading = false;
        }
      });
    } catch (e) {
      this.toast.danger('Error al cargar inventario');
      this.loading = false;
    }
  }

  getSvgForInstrument(type: string): string {
    if (type === 'guitar') return 'icons/instruments/guitar.svg';
    if (type === 'bass') return 'icons/instruments/bass_guitar.svg';
    if (type === 'drums') return 'icons/instruments/drum.svg';
    if (type === 'keyboard') return 'icons/instruments/synth.svg';
    return 'icons/instruments/guitar.svg';
  }

  getSvgForAmp(type: string): string {
    if (type === 'bass') return 'icons/instruments/bass_amp.svg';
    return 'icons/instruments/guitar_amp.svg';
  }

  toggleCategory(cat: EquipmentCategory) {
    cat.open = !cat.open;
  }

  onDragEnded(event: CdkDragEnd, item: StageItem) {
    const transform = event.source.getFreeDragPosition();
    item.x = transform.x;
    item.y = transform.y;
    this.savePlot();
  }

  addToStage(eq: StageItem) {
    if (this.items.find(i => i.id === eq.id)) {
      this.toast.warning('Este elemento ya está en el escenario');
      return;
    }
    const newItem = { ...eq, x: 100, y: 100 };
    this.items.push(newItem);
    this.selectItem(newItem);
    this.savePlot();
  }

  removeFromStage(item: StageItem) {
    this.items = this.items.filter(i => i.id !== item.id);
    if (this.selectedItem?.id === item.id) {
      this.selectedItem = null;
    }
    this.savePlot();
  }

  selectItem(item: StageItem) {
    this.selectedItem = item;
  }

  deselectAll() {
    this.selectedItem = null;
  }

  onRotationChange() {
    this.savePlot();
  }

  savePlot() {
    this.saving = true;
    this.stagePlotService.saveStagePlot(JSON.stringify(this.items)).subscribe({
      next: () => {
        this.saving = false;
      },
      error: () => {
        this.toast.danger('Error al guardar Stage Plot');
        this.saving = false;
      }
    });
  }

  printStagePlot() {
    this.selectedItem = null; // deselect to remove outlines before printing
    setTimeout(() => {
      window.print();
    }, 100);
  }
}
