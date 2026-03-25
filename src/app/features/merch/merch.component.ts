import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import {
  MerchItem, MerchSaleDto, MerchWaitingEntry, MERCH_TYPES, MERCH_SIZES, SIZED_MERCH_TYPES,
  calcMerchAnalysis,
} from '../../core/models/merch.model';
import { Gig } from '../../core/models/gig.model';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { TpvSessionService } from '../../core/services/tpv-session.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog.component';
import { MerchItemFormComponent, MerchItemFormData } from './merch-item-form/merch-item-form.component';
import { MerchDetailDialogComponent } from './merch-detail-dialog/merch-detail-dialog.component';
import { MerchSaleDialogComponent } from './merch-sale-dialog/merch-sale-dialog.component';
import { WaitingListFormComponent, WaitingListFormData, WaitingListFormResult } from './waiting-list-form/waiting-list-form.component';

export interface CartItem {
  item: MerchItem;
  size?: string;
  quantity: number;
}

type MerchTab = 'catalogo' | 'stock' | 'tpv' | 'espera';

@Component({
  selector: 'app-merch',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './merch.component.html',
  styleUrls: ['./merch.component.scss'],
})
export class MerchComponent implements OnInit {
  private readonly db = inject(DatabaseService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(Dialog);
  readonly tpvSession = inject(TpvSessionService);

  items: MerchItem[] = [];
  gigs: Gig[] = [];
  waitingList: MerchWaitingEntry[] = [];
  loading = true;
  tab: MerchTab = 'catalogo';

  // --- Waiting list state ---
  waitingFilter: 'all' | 'waiting' | 'notified' | 'delivered' = 'waiting';

  // TPV gig picker state
  tpvShowGigPicker = false;
  showNoGigAlert = false;

  // --- TPV state ---
  cart: CartItem[] = [];
  tpvSaleDate = new Date().toISOString().slice(0, 10);
  tpvNotes = '';
  tpvSelling = false;
  /** Item selected in TPV (for size picker) */
  tpvPendingItem: MerchItem | null = null;
  tpvPendingSize: string | undefined;

  // --- Stock tab state ---
  restockingItem: MerchItem | null = null;
  restockValues: Record<string, number> = {};   // size → qty  OR  { _total: qty }
  restocking = false;

  readonly MERCH_SIZES = MERCH_SIZES;
  readonly Math = Math;
  readonly Infinity = Infinity;

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      [this.items, this.gigs, this.waitingList] = await Promise.all([
        this.db.getMerchItems(),
        this.db.getGigs(),
        this.db.getMerchWaitingList(),
      ]);
    } catch (e) {
      this.toast.danger('Error cargando productos de merch');
    } finally {
      this.loading = false;
    }
  }

  setTab(t: MerchTab): void {
    this.tab = t;
    this.tpvPendingItem = null;
    this.tpvPendingSize = undefined;
    this.showNoGigAlert = false;
    this.tpvShowGigPicker = false;
  }

  // TPV gig helpers
  formatGigDate(d: string): string {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }

  tpvSelectGig(gig: Gig | null): void {
    this.tpvSession.setGig(gig);
    this.tpvShowGigPicker = false;
    this.showNoGigAlert = false;
  }

  tpvContinueWithoutGig(): void {
    this.showNoGigAlert = false;
    this.doCheckout();
  }

  typeLabel(type: string): string {
    return MERCH_TYPES.find(t => t.value === type)?.label ?? type;
  }

  analysis(item: MerchItem) {
    return calcMerchAnalysis(item);
  }

  fmt(v: number): string {
    return v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  isSizeable(item: MerchItem): boolean {
    return SIZED_MERCH_TYPES.includes(item.type);
  }

  // ── Sales tracking ───────────────────────────────────────────────────────

  soldUnits(item: MerchItem): number {
    return Math.max(0, item.batchSize - item.stock);
  }

  currentPnL(item: MerchItem): number {
    const investment = item.batchSize * item.productionCost + item.fixedCosts;
    return this.soldUnits(item) * item.sellingPrice - investment;
  }

  soldPct(item: MerchItem): number {
    if (item.batchSize === 0) return 0;
    return Math.min(100, (this.soldUnits(item) / item.batchSize) * 100);
  }

  bePct(item: MerchItem): number {
    const a = calcMerchAnalysis(item);
    if (a.breakEvenUnits === Infinity || item.batchSize === 0) return 100;
    return Math.min(100, (a.breakEvenUnits / item.batchSize) * 100);
  }

  pnlStatus(item: MerchItem): 'none' | 'loss' | 'even' | 'profit' {
    if (this.soldUnits(item) === 0) return 'none';
    const pnl = this.currentPnL(item);
    if (pnl > 0.01) return 'profit';
    if (pnl >= -0.01) return 'even';
    return 'loss';
  }

  unitsToBreakEven(item: MerchItem): number {
    const a = calcMerchAnalysis(item);
    if (a.breakEvenUnits === Infinity) return Infinity;
    return Math.max(0, a.breakEvenUnits - this.soldUnits(item));
  }

  // ── Catálogo dialogs ─────────────────────────────────────────────────────

  openDetail(item: MerchItem): void {
    this.dialog.open(MerchDetailDialogComponent, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      disableClose: false,
      data: item,
    });
  }

  openCreate(): void {
    const ref = this.dialog.open<Partial<MerchItem>>(MerchItemFormComponent, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      disableClose: true,
      data: { item: null } satisfies MerchItemFormData,
    });
    ref.closed.subscribe(async result => {
      if (!result) return;
      try {
        const created = await this.db.createMerchItem(result as Omit<MerchItem, 'id' | 'createdAt'>);
        this.items = [...this.items, created];
        this.toast.success('Producto creado');
      } catch (e) {
        this.toast.danger(String(e));
      }
    });
  }

  openEdit(item: MerchItem, event: MouseEvent): void {
    event.stopPropagation();
    const ref = this.dialog.open<Partial<MerchItem>>(MerchItemFormComponent, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      disableClose: true,
      data: { item } satisfies MerchItemFormData,
    });
    ref.closed.subscribe(async result => {
      if (!result) return;
      try {
        const updated = await this.db.updateMerchItem({ ...item, ...result });
        this.items = this.items.map(i => i.id === updated.id ? updated : i);
        this.toast.success('Producto actualizado');
      } catch (e) {
        this.toast.danger(String(e));
      }
    });
  }

  openSell(item: MerchItem, event: MouseEvent): void {
    event.stopPropagation();
    const ref = this.dialog.open<MerchSaleDto>(MerchSaleDialogComponent, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      disableClose: true,
      data: item,
    });
    ref.closed.subscribe(async result => {
      if (!result) return;
      try {
        const { item: updated } = await this.db.sellMerchItem(item.id, result);
        this.items = this.items.map(i => i.id === updated.id ? updated : i);
        const total = (result.quantity * result.unitPrice).toFixed(2);
        const sizeLabel = result.size ? ` [${result.size}]` : '';
        this.toast.success(`Venta: ${result.quantity}× ${item.name}${sizeLabel} — ${total}€`);
      } catch (e) {
        this.toast.danger(String(e));
      }
    });
  }

  deleteItem(item: MerchItem, event: MouseEvent): void {
    event.stopPropagation();
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      disableClose: true,
      data: {
        title: 'Eliminar producto',
        message: `¿Eliminar "${item.name}"? Esta acción no se puede deshacer.`,
        confirmLabel: 'Eliminar',
      } satisfies ConfirmDialogData,
    });
    ref.closed.subscribe(async confirmed => {
      if (!confirmed) return;
      try {
        await this.db.deleteMerchItem(item.id);
        this.items = this.items.filter(i => i.id !== item.id);
        this.toast.success('Producto eliminado');
      } catch (e) {
        this.toast.danger(String(e));
      }
    });
  }

  // ── Stock tab ────────────────────────────────────────────────────────────

  totalStock(item: MerchItem): number {
    return item.stock;
  }

  sizeStock(item: MerchItem, size: string): number {
    return item.stockSizes?.[size] ?? 0;
  }

  startRestock(item: MerchItem): void {
    this.restockingItem = item;
    if (item.hasSizes) {
      this.restockValues = {};
      for (const s of MERCH_SIZES) {
        this.restockValues[s] = item.stockSizes?.[s] ?? 0;
      }
    } else {
      this.restockValues = { _total: item.stock };
    }
  }

  cancelRestock(): void {
    this.restockingItem = null;
    this.restockValues = {};
  }

  get restockTotal(): number {
    if (this.restockingItem?.hasSizes) {
      return Object.values(this.restockValues).reduce((a, b) => a + (b || 0), 0);
    }
    return this.restockValues['_total'] ?? 0;
  }

  restockDelta(delta: number): void {
    const cur = this.restockValues['_total'] ?? 0;
    this.restockValues['_total'] = Math.max(0, cur + delta);
  }

  async saveRestock(): Promise<void> {
    if (!this.restockingItem) return;
    this.restocking = true;
    try {
      const dto = this.restockingItem.hasSizes
        ? { stockSizes: { ...this.restockValues } }
        : { stock: this.restockValues['_total'] ?? 0 };
      const updated = await this.db.restockMerchItem(this.restockingItem.id, dto);
      this.items = this.items.map(i => i.id === updated.id ? updated : i);
      this.restockingItem = null;
      this.restockValues = {};
      this.toast.success('Stock actualizado');
    } catch (e) {
      this.toast.danger(String(e));
    } finally {
      this.restocking = false;
    }
  }

  // ── TPV tab ──────────────────────────────────────────────────────────────

  tpvAvailableItems(): MerchItem[] {
    return this.items.filter(i => i.stock > 0);
  }

  tpvSelectItem(item: MerchItem): void {
    if (item.hasSizes) {
      this.tpvPendingItem = item;
      // Auto-select first size with stock
      this.tpvPendingSize = MERCH_SIZES.find(s => (item.stockSizes?.[s] ?? 0) > 0);
    } else {
      this.addToCart(item, undefined);
    }
  }

  tpvConfirmSize(): void {
    if (!this.tpvPendingItem || !this.tpvPendingSize) return;
    this.addToCart(this.tpvPendingItem, this.tpvPendingSize);
    this.tpvPendingItem = null;
    this.tpvPendingSize = undefined;
  }

  private addToCart(item: MerchItem, size: string | undefined): void {
    const existing = this.cart.find(c => c.item.id === item.id && c.size === size);
    if (existing) {
      const maxStock = size ? (item.stockSizes?.[size] ?? 0) : item.stock;
      if (existing.quantity < maxStock) {
        existing.quantity++;
      }
    } else {
      this.cart.push({ item, size, quantity: 1 });
    }
  }

  cartChangeQty(entry: CartItem, delta: number): void {
    const maxStock = entry.size
      ? (entry.item.stockSizes?.[entry.size] ?? 0)
      : entry.item.stock;
    const newQty = entry.quantity + delta;
    if (newQty < 1) {
      this.removeFromCart(entry);
    } else {
      entry.quantity = Math.min(newQty, maxStock);
    }
  }

  removeFromCart(entry: CartItem): void {
    this.cart = this.cart.filter(c => c !== entry);
  }

  get cartTotal(): number {
    return this.cart.reduce((sum, c) => sum + c.item.sellingPrice * c.quantity, 0);
  }

  get cartIsEmpty(): boolean {
    return this.cart.length === 0;
  }

  tpvCheckout(): void {
    if (this.cartIsEmpty || this.tpvSelling) return;
    if (!this.tpvSession.gig()) {
      this.showNoGigAlert = true;
      return;
    }
    this.doCheckout();
  }

  private async doCheckout(): Promise<void> {
    this.tpvSelling = true;
    try {
      const gigId = this.tpvSession.gig()?.id;
      for (const entry of this.cart) {
        const dto: MerchSaleDto = {
          quantity: entry.quantity,
          unitPrice: entry.item.sellingPrice,
          date: this.tpvSaleDate,
          size: entry.size,
          notes: this.tpvNotes || undefined,
          gigId,
        };
        const { item: updated } = await this.db.sellMerchItem(entry.item.id, dto);
        this.items = this.items.map(i => i.id === updated.id ? updated : i);
      }
      const total = this.cartTotal.toFixed(2);
      const nItems = this.cart.reduce((s, c) => s + c.quantity, 0);
      this.cart = [];
      this.tpvNotes = '';
      this.toast.success(`Venta registrada: ${nItems} artículo(s) — ${total}€ → Finanzas`);
    } catch (e) {
      this.toast.danger(String(e));
    } finally {
      this.tpvSelling = false;
    }
  }

  tpvSizeStock(item: MerchItem, size: string): number {
    return item.stockSizes?.[size] ?? 0;
  }

  // ── Waiting list ──────────────────────────────────────────────────

  get filteredWaiting(): MerchWaitingEntry[] {
    if (this.waitingFilter === 'all') return this.waitingList;
    return this.waitingList.filter(e => e.status === this.waitingFilter);
  }

  get waitingPendingCount(): number {
    return this.waitingList.filter(e => e.status === 'waiting').length;
  }

  /** Entries grouped by itemId for template rendering */
  get waitingByItem(): { itemId: string; itemName: string; entries: MerchWaitingEntry[] }[] {
    const map = new Map<string, { itemId: string; itemName: string; entries: MerchWaitingEntry[] }>();
    for (const e of this.filteredWaiting) {
      if (!map.has(e.itemId)) map.set(e.itemId, { itemId: e.itemId, itemName: e.itemName, entries: [] });
      map.get(e.itemId)!.entries.push(e);
    }
    return Array.from(map.values());
  }

  getZeroSizes(item: MerchItem): string[] {
    if (!item.stockSizes) return [];
    return ['XS', 'S', 'M', 'L', 'XL', 'XXL'].filter(s => (item.stockSizes![s] ?? 0) === 0);
  }

  openAddWaiting(item: MerchItem, size?: string): void {
    const ref = this.dialog.open<WaitingListFormResult>(WaitingListFormComponent, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      disableClose: true,
      data: { item, size } satisfies WaitingListFormData,
    });
    ref.closed.subscribe(async result => {
      if (!result) return;
      try {
        const entry = await this.db.addMerchWaiting(item.id, result);
        this.waitingList = [...this.waitingList, entry];
        this.toast.success(`${result.name} añadido a la lista de espera`);
      } catch {
        this.toast.danger('No se pudo añadir a la lista de espera');
      }
    });
  }

  async markWaiting(entry: MerchWaitingEntry, status: 'notified' | 'delivered'): Promise<void> {
    if (status === 'delivered') {
      const item = this.items.find(i => i.id === entry.itemId);
      if (!item) return;

      // Check stock
      const available = item.hasSizes && entry.size
        ? (item.stockSizes?.[entry.size] ?? 0)
        : item.stock;

      if (available < entry.quantity) {
        this.toast.danger(
          `Stock insuficiente${entry.size ? ` (talla ${entry.size})` : ''}: ${available} ud${available !== 1 ? 's' : ''} disponible${available !== 1 ? 's' : ''}, se necesitan ${entry.quantity}`
        );
        return;
      }

      // Sell → reduce stock + create income transaction
      try {
        const { item: updated } = await this.db.sellMerchItem(item.id, {
          quantity: entry.quantity,
          unitPrice: item.sellingPrice,
          date: new Date().toISOString().slice(0, 10),
          size: entry.size,
          notes: `Lista de espera: ${entry.name}`,
        });
        this.items = this.items.map(i => i.id === updated.id ? updated : i);
      } catch {
        this.toast.danger('No se pudo registrar la venta');
        return;
      }
    }

    try {
      const updated = await this.db.updateMerchWaiting(entry.id, { status });
      this.waitingList = this.waitingList.map(e => e.id === updated.id ? updated : e);
      this.toast.success(
        status === 'notified'
          ? `${entry.name} marcado como avisado`
          : `${entry.name} entregado — stock y finanzas actualizados`
      );
    } catch {
      this.toast.danger('No se pudo actualizar');
    }
  }

  deleteWaiting(entry: MerchWaitingEntry): void {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      disableClose: true,
      data: { title: 'Eliminar de la lista', message: `¿Eliminar a ${entry.name} de la lista de espera?`, confirmLabel: 'Eliminar' } satisfies ConfirmDialogData,
    });
    ref.closed.subscribe(async confirmed => {
      if (!confirmed) return;
      try {
        await this.db.deleteMerchWaiting(entry.id);
        this.waitingList = this.waitingList.filter(e => e.id !== entry.id);
        this.toast.warning('Entrada eliminada');
      } catch {
        this.toast.danger('No se pudo eliminar');
      }
    });
  }

  statusLabel(s: string): string {
    return ({ waiting: 'Esperando', notified: 'Avisado', delivered: 'Entregado' } as Record<string,string>)[s] ?? s;
  }

  statusBadge(s: string): string {
    return ({ waiting: 'badge-warning', notified: 'badge-info', delivered: 'badge-success' } as Record<string,string>)[s] ?? 'badge-ghost';
  }
}
