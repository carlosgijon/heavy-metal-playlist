export type TransactionType = 'income' | 'expense';

export type IncomeCategory = 'gig' | 'merch_sales' | 'streaming' | 'teaching' | 'sponsorship' | 'other';
export type ExpenseCategory =
  | 'equipment'
  | 'travel'
  | 'accommodation'
  | 'recording'
  | 'marketing'
  | 'rehearsal'
  | 'merch_production'
  | 'venue'
  | 'other';

export const INCOME_CATEGORIES: { value: IncomeCategory; label: string }[] = [
  { value: 'gig', label: 'Concierto' },
  { value: 'merch_sales', label: 'Venta de merch' },
  { value: 'streaming', label: 'Streaming / Royalties' },
  { value: 'teaching', label: 'Clases / Talleres' },
  { value: 'sponsorship', label: 'Patrocinio' },
  { value: 'other', label: 'Otro' },
];

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'equipment', label: 'Equipamiento' },
  { value: 'travel', label: 'Desplazamiento' },
  { value: 'accommodation', label: 'Alojamiento' },
  { value: 'recording', label: 'Grabación / Estudio' },
  { value: 'marketing', label: 'Marketing / Promo' },
  { value: 'rehearsal', label: 'Local de ensayo' },
  { value: 'merch_production', label: 'Producción de merch' },
  { value: 'venue', label: 'Sala / Promotor' },
  { value: 'other', label: 'Otro' },
];

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  date: string; // YYYY-MM-DD
  description?: string;
  gigId?: string;
  createdAt: string;
}

export interface WishListItem {
  id: string;
  name: string;
  category: string;
  estimatedPrice?: number;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  purchased: boolean;
  createdAt: string;
}

export const WISHLIST_CATEGORIES = [
  { value: 'instrument', label: 'Instrumento' },
  { value: 'equipment', label: 'Equipamiento' },
  { value: 'merch', label: 'Merchandising' },
  { value: 'studio', label: 'Estudio / Grabación' },
  { value: 'other', label: 'Otro' },
];
