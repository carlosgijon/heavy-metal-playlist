import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { Chart, registerables } from 'chart.js';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  Transaction,
  WISHLIST_CATEGORIES,
  WishListItem,
} from '../../core/models/finance.model';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { Gig } from '../../core/models/gig.model';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog.component';
import { TransactionFormComponent, TransactionFormData } from './transaction-form/transaction-form.component';
import { WishListItemFormComponent, WishListFormData } from './wishlist-item-form/wishlist-item-form.component';

Chart.register(...registerables);

type FinanzasTab = 'resumen' | 'transacciones' | 'wishlist';

@Component({
  selector: 'app-finanzas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './finanzas.component.html',
  styleUrls: ['./finanzas.component.scss'],
})
export class FinanzasComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly db = inject(DatabaseService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(Dialog);

  @ViewChild('barCanvas') barCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutCanvas') donutCanvas!: ElementRef<HTMLCanvasElement>;

  tab: FinanzasTab = 'resumen';
  loading = true;

  transactions: Transaction[] = [];
  wishList: WishListItem[] = [];
  gigs: Gig[] = [];

  initialBalance = 0;
  editingBalance = false;
  balanceDraft = 0;
  savingBalance = false;

  // Filters for transactions tab
  filterType = 'all';
  filterYear = new Date().getFullYear();

  // Filters for wishlist tab
  filterPurchased = false;

  private barChart: Chart | null = null;
  private donutChart: Chart | null = null;
  private chartsBuilt = false;

  readonly incomeCategories = INCOME_CATEGORIES;
  readonly expenseCategories = EXPENSE_CATEGORIES;
  readonly wishlistCategories = WISHLIST_CATEGORIES;

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  ngAfterViewInit(): void {
    if (!this.loading) {
      this.buildCharts();
    }
  }

  ngOnDestroy(): void {
    this.barChart?.destroy();
    this.donutChart?.destroy();
  }

  async load(): Promise<void> {
    try {
      this.loading = true;
      const [transactions, wishList, gigs, balanceRes] = await Promise.all([
        this.db.getTransactions(),
        this.db.getWishList(),
        this.db.getGigs(),
        this.db.getInitialBalance(),
      ]);
      this.transactions = transactions;
      this.wishList = wishList;
      this.gigs = gigs;
      this.initialBalance = balanceRes.initialBalance;
    } catch {
      this.toast.danger('Error al cargar los datos financieros', 'Error');
    } finally {
      this.loading = false;
      setTimeout(() => this.buildCharts(), 0);
    }
  }

  onTabChange(t: FinanzasTab): void {
    this.tab = t;
    if (t === 'resumen') {
      setTimeout(() => this.buildCharts(), 0);
    }
  }

  // ── KPIs ──────────────────────────────────────────────────────────

  get totalIncome(): number {
    return this.transactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
  }

  get totalExpenses(): number {
    return this.transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
  }

  get balance(): number {
    return this.totalIncome - this.totalExpenses;
  }

  get currentBalance(): number {
    return this.initialBalance + this.totalIncome - this.totalExpenses;
  }

  startEditBalance(): void {
    this.balanceDraft = this.initialBalance;
    this.editingBalance = true;
  }

  cancelEditBalance(): void {
    this.editingBalance = false;
  }

  async saveInitialBalance(): Promise<void> {
    this.savingBalance = true;
    try {
      const res = await this.db.setInitialBalance(this.balanceDraft);
      this.initialBalance = res.initialBalance;
      this.editingBalance = false;
      this.toast.success('Saldo inicial guardado');
    } catch {
      this.toast.danger('No se pudo guardar el saldo inicial', 'Error');
    } finally {
      this.savingBalance = false;
    }
  }

  // ── Filtered transactions ─────────────────────────────────────────

  get availableYears(): number[] {
    const years = new Set(this.transactions.map(t => parseInt(t.date.slice(0, 4), 10)));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }

  get filteredTransactions(): Transaction[] {
    return this.transactions.filter(t => {
      if (this.filterType !== 'all' && t.type !== this.filterType) return false;
      if (t.date.slice(0, 4) !== String(this.filterYear)) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }

  // ── Wishlist ──────────────────────────────────────────────────────

  get filteredWishList(): WishListItem[] {
    return this.wishList
      .filter(w => w.purchased === this.filterPurchased)
      .sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      });
  }

  get wishListPendingCount(): number {
    return this.wishList.filter(w => !w.purchased).length;
  }

  get wishListTotal(): number {
    return this.wishList
      .filter(w => !w.purchased && w.estimatedPrice)
      .reduce((acc, w) => acc + (w.estimatedPrice ?? 0), 0);
  }

  // ── Labels ────────────────────────────────────────────────────────

  getCategoryLabel(type: string, category: string): string {
    const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    return cats.find(c => c.value === category)?.label ?? category;
  }

  getWishCategoryLabel(category: string): string {
    return WISHLIST_CATEGORIES.find(c => c.value === category)?.label ?? category;
  }

  priorityLabel(p: string): string {
    return { high: 'Alta', medium: 'Media', low: 'Baja' }[p] ?? p;
  }

  priorityBadge(p: string): string {
    return { high: 'badge-error', medium: 'badge-warning', low: 'badge-ghost' }[p] ?? 'badge-ghost';
  }

  formatAmount(amount: number): string {
    return amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ── CRUD Transactions ─────────────────────────────────────────────

  openTransactionForm(transaction: Transaction | null = null): void {
    const ref = this.dialog.open<Partial<Transaction>>(TransactionFormComponent, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      disableClose: true,
      data: { transaction, gigs: this.gigs } satisfies TransactionFormData,
    });
    ref.closed.subscribe(async result => {
      if (!result) return;
      try {
        if (transaction?.id) {
          const updated = await this.db.updateTransaction({ ...transaction, ...result } as Transaction);
          this.transactions = this.transactions.map(t => t.id === updated.id ? updated : t);
          this.toast.success('Transacción actualizada', 'Actualizado');
        } else {
          const created = await this.db.createTransaction(result as Omit<Transaction, 'id' | 'createdAt'>);
          this.transactions = [...this.transactions, created];
          this.toast.success('Transacción añadida', 'Añadido');
        }
        setTimeout(() => this.buildCharts(), 0);
      } catch {
        this.toast.danger('No se pudo guardar la transacción', 'Error');
      }
    });
  }

  deleteTransaction(t: Transaction): void {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      disableClose: true,
      data: {
        title: 'Eliminar transacción',
        message: `¿Eliminar esta transacción de ${this.formatAmount(t.amount)} €?`,
        confirmLabel: 'Eliminar',
      } satisfies ConfirmDialogData,
    });
    ref.closed.subscribe(async confirmed => {
      if (!confirmed) return;
      try {
        await this.db.deleteTransaction(t.id);
        this.transactions = this.transactions.filter(tx => tx.id !== t.id);
        this.toast.warning('Transacción eliminada', 'Eliminado');
        setTimeout(() => this.buildCharts(), 0);
      } catch {
        this.toast.danger('No se pudo eliminar', 'Error');
      }
    });
  }

  // ── CRUD WishList ─────────────────────────────────────────────────

  openWishListForm(item: WishListItem | null = null): void {
    const wasAlreadyPurchased = item?.purchased ?? false;
    const ref = this.dialog.open<Partial<WishListItem>>(WishListItemFormComponent, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      disableClose: true,
      data: { item } satisfies WishListFormData,
    });
    ref.closed.subscribe(async result => {
      if (!result) return;
      try {
        if (item?.id) {
          const updated = await this.db.updateWishListItem({ ...item, ...result } as WishListItem);
          this.wishList = this.wishList.map(w => w.id === updated.id ? updated : w);
          this.toast.success('Elemento actualizado', 'Actualizado');
          // If just marked as purchased → backend created an expense → reload transactions + charts
          if (!wasAlreadyPurchased && updated.purchased) {
            await this.reloadTransactions();
          }
        } else {
          const created = await this.db.createWishListItem(result as Omit<WishListItem, 'id' | 'createdAt'>);
          this.wishList = [...this.wishList, created];
          this.toast.success(`"${created.name}" añadido a la lista`, 'Añadido');
        }
      } catch {
        this.toast.danger('No se pudo guardar', 'Error');
      }
    });
  }

  private async reloadTransactions(): Promise<void> {
    try {
      this.transactions = await this.db.getTransactions();
      setTimeout(() => this.buildCharts(), 0);
    } catch {
      // silent
    }
  }

  async markPurchased(item: WishListItem): Promise<void> {
    try {
      const updated = await this.db.updateWishListItem({ ...item, purchased: true });
      this.wishList = this.wishList.map(w => w.id === updated.id ? updated : w);
      this.toast.success(`"${item.name}" marcado como adquirido`);
      await this.reloadTransactions();
    } catch {
      this.toast.danger('No se pudo actualizar', 'Error');
    }
  }

  deleteWishItem(item: WishListItem): void {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      disableClose: true,
      data: {
        title: 'Eliminar elemento',
        message: `¿Eliminar "${item.name}" de la lista?`,
        confirmLabel: 'Eliminar',
      } satisfies ConfirmDialogData,
    });
    ref.closed.subscribe(async confirmed => {
      if (!confirmed) return;
      try {
        await this.db.deleteWishListItem(item.id);
        this.wishList = this.wishList.filter(w => w.id !== item.id);
        this.toast.warning(`"${item.name}" eliminado`, 'Eliminado');
      } catch {
        this.toast.danger('No se pudo eliminar', 'Error');
      }
    });
  }

  // ── Charts ────────────────────────────────────────────────────────

  private buildCharts(): void {
    if (this.tab !== 'resumen') return;
    if (!this.barCanvas?.nativeElement || !this.donutCanvas?.nativeElement) return;

    this.barChart?.destroy();
    this.donutChart?.destroy();

    this.buildBarChart();
    this.buildDonutChart();
    this.chartsBuilt = true;
  }

  private buildBarChart(): void {
    const months: string[] = [];
    const incomeData: number[] = [];
    const expenseData: number[] = [];

    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push(d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }));
      incomeData.push(
        this.transactions.filter(t => t.type === 'income' && t.date.startsWith(ym)).reduce((a, t) => a + t.amount, 0)
      );
      expenseData.push(
        this.transactions.filter(t => t.type === 'expense' && t.date.startsWith(ym)).reduce((a, t) => a + t.amount, 0)
      );
    }

    this.barChart = new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Ingresos',
            data: incomeData,
            backgroundColor: 'rgba(34, 197, 94, 0.7)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'Gastos',
            data: expenseData,
            backgroundColor: 'rgba(239, 68, 68, 0.7)',
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${this.formatAmount(ctx.parsed.y as number)} €`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: v => `${v} €` },
          },
        },
      },
    });
  }

  private buildDonutChart(): void {
    const expensesByCategory: Record<string, number> = {};
    this.transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] ?? 0) + t.amount;
      });

    const labels = Object.keys(expensesByCategory).map(k =>
      EXPENSE_CATEGORIES.find(c => c.value === k)?.label ?? k
    );
    const data = Object.values(expensesByCategory);

    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
      '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b',
    ];

    this.donutChart = new Chart(this.donutCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.slice(0, data.length),
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${this.formatAmount(ctx.parsed as number)} €`,
            },
          },
        },
      },
    });
  }
}
