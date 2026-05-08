import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragEnd } from '@angular/cdk/drag-drop';
import { StagePlotService } from '../../../core/services/stage-plot.service';
import { DatabaseService } from '../../../core/services/database.service';
import { ToastService } from '../../../core/services/toast.service';

interface StageItem {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  icon?: string;
}

@Component({
  selector: 'app-stage-plot',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './stage-plot.component.html',
  styleUrls: ['./stage-plot.component.scss']
})
export class StagePlotComponent implements OnInit {

  items: StageItem[] = [];
  availableEquipment: StageItem[] = [];
  loading = true;
  saving = false;

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
      const [members, instruments, amps] = await Promise.all([
        this.db.getMembers(),
        this.db.getInstruments(),
        this.db.getAmplifiers()
      ]);

      const eq: StageItem[] = [];
      instruments.forEach(i => {
        eq.push({ id: `inst_${i.id}`, type: 'instrument', label: i.name, x: 0, y: 0, icon: 'guitar' });
      });
      amps.forEach(a => {
        eq.push({ id: `amp_${a.id}`, type: 'amp', label: a.name, x: 0, y: 0, icon: 'amp' });
      });
      members.forEach(m => {
        eq.push({ id: `member_${m.id}`, type: 'member', label: m.name, x: 0, y: 0, icon: 'vocal' });
      });
      
      // Additional general elements
      eq.push({ id: 'gen_drum', type: 'drums', label: 'Batería', x: 0, y: 0, icon: 'drums' });
      eq.push({ id: 'gen_mic1', type: 'mic', label: 'Vocal Mic', x: 0, y: 0, icon: 'mic' });
      eq.push({ id: 'gen_monitor1', type: 'monitor', label: 'Monitor', x: 0, y: 0, icon: 'monitor' });

      this.availableEquipment = eq;

      // 2. Fetch saved positions
      this.stagePlotService.getStagePlot().subscribe({
        next: (plot) => {
          if (plot.plotData && plot.plotData !== '[]') {
            try {
              const savedItems: StageItem[] = JSON.parse(plot.plotData);
              this.items = savedItems;
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
    const newItem = { ...eq, x: 50, y: 50 };
    this.items.push(newItem);
    this.savePlot();
  }

  removeFromStage(item: StageItem) {
    this.items = this.items.filter(i => i.id !== item.id);
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
    window.print();
  }
}
