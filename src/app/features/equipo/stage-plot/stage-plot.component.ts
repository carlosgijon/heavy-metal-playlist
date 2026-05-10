import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragEnd, CdkDragMove } from '@angular/cdk/drag-drop';
import { StagePlotService } from '../../../core/services/stage-plot.service';
import { DatabaseService } from '../../../core/services/database.service';
import { ToastService } from '../../../core/services/toast.service';
import { NgIconComponent } from '@ng-icons/core';
import { findOrthogonalPath } from './a-star.util';

export interface StageItem {
  id: string;
  type: string; // 'member', 'instrument', 'amp', 'mic', 'drums', etc.
  label: string;
  displayType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  iconType: 'ng-icon' | 'svg';
  iconValue: string;
  currentX?: number;
  currentY?: number;
  isStereo?: boolean;
}

export interface Cable {
  id: string;
  fromId: string;
  toId: string;
  color?: string;
  pathPoints?: {x: number, y: number}[];
  isStereo?: boolean;
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
  imports: [CommonModule, FormsModule, DragDropModule, NgIconComponent],
  templateUrl: './stage-plot.component.html',
  styleUrls: ['./stage-plot.component.scss']
})
export class StagePlotComponent implements OnInit {

  items: StageItem[] = [];
  cables: Cable[] = [];
  categories: EquipmentCategory[] = [];
  
  loading = true;
  saving = false;
  
  selectedItem: StageItem | null = null;
  connectingFrom: StageItem | null = null;

  @ViewChild('stageContainer') stageContainer?: ElementRef;

  get stageHeight(): number {
    if (this.stageContainer && this.stageContainer.nativeElement) {
      return this.stageContainer.nativeElement.clientHeight;
    }
    return 650; // Fallback
  }

  @HostListener('window:resize')
  onResize() {
    this.recalculateCables();
  }

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
          id: `member_${m.id}`, type: 'member', label: m.name, displayType: 'Integrante',
          x: 0, y: 0, width: 90, height: 90, rotation: 0,
          iconType: 'ng-icon', iconValue: 'heroUser' 
        });
      });

      instruments.forEach(i => {
        const isDrum = i.type === 'drums';
        const isKeys = i.type === 'keyboard';
        const w = isDrum ? 260 : (isKeys ? 200 : 100);
        const h = isDrum ? 260 : (isKeys ? 80 : 100);
        catInstruments.push({ 
          id: `inst_${i.id}`, type: 'instrument', label: i.name, displayType: i.type,
          x: 0, y: 0, width: w, height: h, rotation: 0,
          isStereo: i.monoStereo === 'stereo',
          iconType: 'svg', iconValue: this.getSvgForInstrument(i.type) 
        });
      });

      amps.forEach(a => {
        catAmps.push({ 
          id: `amp_${a.id}`, type: 'amp', label: a.name, displayType: 'Amplificador',
          x: 0, y: 0, width: 140, height: 80, rotation: 0,
          isStereo: a.monoStereo === 'stereo',
          iconType: 'svg', iconValue: this.getSvgForAmp(a.type) 
        });
      });

      mics.forEach(m => {
        let iconPath = 'icons/instruments/vocal_mic.svg';
        if (m.usage === 'drums-kick') iconPath = 'icons/instruments/kick_mic.svg';
        else if (m.usage === 'drums-overhead') iconPath = 'icons/instruments/overhead_mic.svg';
        else if (m.usage === 'vocal-headset') iconPath = 'icons/instruments/headset_mic.svg';
        else if (m.usage === 'instrument' || m.usage === 'drums-snare' || m.usage === 'ambient') iconPath = 'icons/instruments/amp_mic_ight.svg';
        
        // Size differentiation
        let w = 80;
        let h = 80;
        if (m.usage === 'vocal') {
          w = 60;
          h = 140; // Rectangular and tall
        } else if (m.usage === 'vocal-headset') {
          w = 40;
          h = 40; // Small
        } else if (m.usage === 'drums-kick') {
          w = 80;
          h = 80;
        } else if (m.usage === 'drums-overhead') {
          w = 260;
          h = 80;
        }

        catMics.push({
          id: `mic_${m.id}`, type: 'mic', label: m.name + (m.brand ? ` (${m.brand})` : ''), displayType: 'Micrófono',
          x: 0, y: 0, width: w, height: h, rotation: 0,
          isStereo: m.monoStereo === 'stereo',
          iconType: 'svg', iconValue: iconPath
        });
      });

      pa.forEach(p => {
        const isMonitor = p.category === 'monitor';
        catOthers.push({
          id: `pa_${p.id}`, type: 'monitor', label: p.name, displayType: isMonitor ? 'Monitor' : 'PA',
          x: 0, y: 0, width: isMonitor ? 90 : 80, height: isMonitor ? 60 : 80, rotation: 0,
          iconType: 'svg', iconValue: 'icons/instruments/DI.svg'
        });
      });

      catInstruments.push({ id: 'gen_drum', type: 'drums', label: 'Batería Genérica', displayType: 'Batería', x: 0, y: 0, width: 260, height: 260, rotation: 0, iconType: 'svg', iconValue: 'icons/instruments/drum.svg' });
      catMics.push({ id: 'gen_mic1', type: 'mic', label: 'Micrófono Genérico', displayType: 'Micrófono', x: 0, y: 0, width: 80, height: 80, rotation: 0, iconType: 'svg', iconValue: 'icons/instruments/vocal_mic.svg' });
      catOthers.push({ id: 'gen_di', type: 'di', label: 'Caja DI Genérica', displayType: 'DI Box', x: 0, y: 0, width: 50, height: 50, rotation: 0, iconType: 'svg', iconValue: 'icons/instruments/DI.svg' });
      
      // Stage Box (Cajetín de escenario) para conectar la mesa FOH
      catOthers.push({ id: 'gen_stagebox', type: 'stagebox', label: 'Cajetín Escenario (Hacia Mesa)', displayType: 'Stage Box / FOH', x: 0, y: 0, width: 70, height: 50, rotation: 0, iconType: 'svg', iconValue: 'icons/instruments/DI.svg' });

      this.categories = [
        { id: 'members', title: 'Integrantes', items: catMembers, open: true },
        { id: 'instruments', title: 'Instrumentos', items: catInstruments, open: false },
        { id: 'amps', title: 'Amplificadores', items: catAmps, open: false },
        { id: 'mics', title: 'Micrófonos', items: catMics, open: false },
        { id: 'others', title: 'PA y Otros', items: catOthers, open: false },
      ];

      this.stagePlotService.getStagePlot().subscribe({
        next: (plot) => {
          if (plot.plotData && plot.plotData !== '[]') {
            try {
              const data = JSON.parse(plot.plotData);
              if (Array.isArray(data)) {
                // Old format
                this.items = data.map(si => this.migrateOldItem(si));
                this.cables = [];
              } else {
                // New format: { items: [], cables: [] }
                this.items = (data.items || []).map((si: any) => this.migrateOldItem(si));
                this.cables = data.cables || [];
              }
              // Sync currentX and currentY
              this.items.forEach(i => {
                i.currentX = i.x;
                i.currentY = i.y;
              });
              setTimeout(() => this.recalculateCables(), 100);
            } catch (e) {
              this.items = [];
              this.cables = [];
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

  private migrateOldItem(si: any): StageItem {
    let w = si.width || 90;
    let h = si.height || 90;
    
    // Forzar siempre los tamaños nuevos para que el stage plot sea uniforme tras la actualización
    if (si.type === 'member') { w = 90; h = 90; }
    else if (si.type === 'drums') { w = 260; h = 260; }
    else if (si.type === 'keyboard') { w = 200; h = 80; }
    else if (si.type === 'instrument') { w = 100; h = 100; }
    else if (si.type === 'amp') { w = 140; h = 80; }
    else if (si.type === 'mic') { 
      w = 80; h = 80; 
      // If the icon is vocal, make it rectangular (60x140)
      if (si.iconValue?.includes('vocal_mic')) {
        w = 60; h = 140;
      } else if (si.iconValue?.includes('overhead_mic')) {
        // Overhead is now a wide horizontal stereo pair
        w = 260; h = 80;
      } else if (si.iconValue?.includes('headset_mic')) {
        w = 40; h = 40;
      }
    }
    else if (si.type === 'monitor') { 
      if (si.displayType === 'PA') { w = 80; h = 80; }
      else { w = 90; h = 60; }
    }
    else if (si.type === 'stagebox') { w = 70; h = 50; }
    else if (si.type === 'di') { w = 50; h = 50; }

    return {
      ...si,
      width: w,
      height: h,
      rotation: si.rotation || 0,
      displayType: si.displayType || si.type,
      currentX: si.x,
      currentY: si.y
    };
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

  isItemOnStage(id: string): boolean {
    return !!this.items.find(i => i.id === id);
  }

  onDragMoved(event: CdkDragMove, item: StageItem) {
    item.currentX = item.x + event.distance.x;
    item.currentY = item.y + event.distance.y;
    this.recalculateCables();
  }

  onDragEnded(event: CdkDragEnd, item: StageItem) {
    const transform = event.source.getFreeDragPosition();
    item.x = transform.x;
    item.y = transform.y;
    item.currentX = item.x;
    item.currentY = item.y;
    this.recalculateCables();
    this.savePlot();
  }

  addToStage(eq: StageItem) {
    if (this.isItemOnStage(eq.id)) {
      return;
    }
    const newItem = { ...eq, x: 200, y: 200, currentX: 200, currentY: 200 };
    this.items.push(newItem);
    this.selectItem(newItem);
    this.savePlot();
  }

  removeFromStage(item: StageItem) {
    this.items = this.items.filter(i => i.id !== item.id);
    this.cables = this.cables.filter(c => c.fromId !== item.id && c.toId !== item.id);
    if (this.selectedItem?.id === item.id) {
      this.selectedItem = null;
      this.connectingFrom = null;
    }
    this.recalculateCables();
    this.savePlot();
  }

  selectItem(item: StageItem) {
    if (this.connectingFrom && this.connectingFrom.id !== item.id) {
      // Complete connection
      this.addCable(this.connectingFrom.id, item.id);
      this.connectingFrom = null;
      this.selectedItem = item;
      return;
    }
    
    this.selectedItem = item;
    this.connectingFrom = null;
  }

  deselectAll() {
    this.selectedItem = null;
    this.connectingFrom = null;
  }

  startConnection(item: StageItem) {
    this.connectingFrom = item;
  }

  cancelConnection() {
    this.connectingFrom = null;
  }

  connectToFOH(item: StageItem) {
    const stageBoxes = this.items.filter(i => i.type === 'stagebox');
    
    if (stageBoxes.length > 0) {
      // Find closest stagebox
      let closestBox = stageBoxes[0];
      let minDistance = Infinity;
      const startX = this.getCenterX(item);
      const startY = this.getCenterY(item);

      stageBoxes.forEach(sb => {
        const dx = this.getCenterX(sb) - startX;
        const dy = this.getCenterY(sb) - startY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < minDistance) {
          minDistance = dist;
          closestBox = sb;
        }
      });
      this.addCable(item.id, closestBox.id);
    } else {
      // No stagebox, go direct to FOH
      this.addCable(item.id, 'FOH');
    }
  }

  addCable(fromId: string, toId: string) {
    // Avoid duplicates
    if (this.cables.find(c => (c.fromId === fromId && c.toId === toId) || (c.fromId === toId && c.toId === fromId))) {
      return;
    }
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    const color = colors[this.cables.length % colors.length];
    
    const fromItem = this.getItemById(fromId);
    const isStereo = fromItem ? !!fromItem.isStereo : false;
    
    this.cables.push({ id: `cable_${Date.now()}`, fromId, toId, color, isStereo });
    this.recalculateCables();
    this.savePlot();
  }

  removeCable(cableId: string) {
    this.cables = this.cables.filter(c => c.id !== cableId);
    this.recalculateCables();
    this.savePlot();
  }

  recalculateCables() {
    const obstacles = this.items.map(i => ({
      id: i.id,
      x: i.currentX || i.x,
      y: i.currentY || i.y,
      w: i.width,
      h: i.height
    }));

    this.cables.forEach((cable, index) => {
      const fromItem = this.getItemById(cable.fromId);
      if (fromItem) {
        if (cable.toId === 'FOH') {
          // Destino fijo hacia abajo (fuera del escenario por la parte inferior)
          cable.pathPoints = findOrthogonalPath(
            this.getCenterX(fromItem), this.getCenterY(fromItem),
            this.getCenterX(fromItem), Math.max(500, this.stageHeight) - 30, // Justo encima del borde inferior
            obstacles,
            [cable.fromId] // exclude
          );
        } else {
          const toItem = this.getItemById(cable.toId);
          if (toItem) {
            cable.pathPoints = findOrthogonalPath(
              this.getCenterX(fromItem), this.getCenterY(fromItem),
              this.getCenterX(toItem), this.getCenterY(toItem),
              obstacles,
              [cable.fromId, cable.toId] // exclude start and end
            );
          }
        }

        // Aplicar offset a los puntos intermedios para que los cables paralelos no se solapen
        if (cable.pathPoints && cable.pathPoints.length >= 2) {
          // Generar un offset basado en el index para separar visualmente los cables que comparten ruta
          const offsets = [-15, -10, -5, 5, 10, 15, -20, 20, -25, 25];
          const offset = offsets[index % offsets.length];
          
          if (cable.pathPoints.length > 2) {
            for (let i = 1; i < cable.pathPoints.length - 1; i++) {
              cable.pathPoints[i].x += offset;
              cable.pathPoints[i].y += offset;
            }
          }

          if (cable.toId === 'FOH') {
            // Offset horizontal al destino final para que no se pisen los textos "A MESA" ni las flechas
            cable.pathPoints[cable.pathPoints.length - 1].x += offset * 3;
          }
        }
      }
    });
  }

  onRotationChange() {
    this.savePlot();
  }

  savePlot() {
    this.saving = true;
    const payload = JSON.stringify({ items: this.items, cables: this.cables });
    this.stagePlotService.saveStagePlot(payload).subscribe({
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
    this.selectedItem = null;
    this.connectingFrom = null;
    setTimeout(() => {
      window.print();
    }, 100);
  }

  // Helpers for SVG cables
  getCenterX(item: StageItem): number {
    return (item.currentX || item.x) + (item.width / 2);
  }

  getCenterY(item: StageItem): number {
    return (item.currentY || item.y) + (item.height / 2);
  }

  getCablePathString(cable: Cable): string {
    if (!cable.pathPoints || cable.pathPoints.length === 0) return '';
    return 'M ' + cable.pathPoints.map(p => `${p.x} ${p.y}`).join(' L ');
  }

  getCableMidPoint(cable: Cable): {x: number, y: number} | null {
    if (!cable.pathPoints || cable.pathPoints.length === 0) return null;
    return cable.pathPoints[Math.floor(cable.pathPoints.length / 2)];
  }

  getItemById(id: string): StageItem | undefined {
    return this.items.find(i => i.id === id);
  }
}
