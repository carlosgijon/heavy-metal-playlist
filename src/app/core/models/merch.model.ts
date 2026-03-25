export const MERCH_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
export type MerchSize = typeof MERCH_SIZES[number];

/** Types that support per-size stock */
export const SIZED_MERCH_TYPES = ['t-shirt', 'hoodie', 'hat', 'patch'];

export interface MerchItem {
  id: string;
  name: string;
  type: string;
  productionCost: number;
  batchSize: number;
  sellingPrice: number;
  fixedCosts: number;
  stock: number;
  hasSizes: boolean;
  stockSizes?: Record<string, number>; // { XS: 0, S: 5, M: 10, L: 8, XL: 3, XXL: 1 }
  notes?: string;
  createdAt: string;
}

export interface MerchSaleDto {
  quantity: number;
  unitPrice: number;
  date: string;
  size?: string;
  notes?: string;
  gigId?: string;
}

export interface MerchRestockDto {
  stock?: number;
  stockSizes?: Record<string, number>;
}

export const MERCH_TYPES = [
  { value: 't-shirt', label: 'Camiseta' },
  { value: 'hoodie', label: 'Sudadera' },
  { value: 'vinyl', label: 'Vinilo' },
  { value: 'cd', label: 'CD' },
  { value: 'poster', label: 'Póster' },
  { value: 'sticker', label: 'Pegatina' },
  { value: 'hat', label: 'Gorra / Gorro' },
  { value: 'patch', label: 'Parche' },
  { value: 'other', label: 'Otro' },
];

export interface MerchWaitingEntry {
  id: string;
  itemId: string;
  itemName: string;
  itemType: string;
  name: string;
  quantity: number;
  size?: string;
  contact?: string;
  notes?: string;
  status: 'waiting' | 'notified' | 'delivered';
  createdAt: string;
}

export interface MerchAnalysis {
  totalCost: number;         // productionCost * batchSize + fixedCosts
  breakEvenUnits: number;    // ceil(totalCost / (sellingPrice - productionCost))
  profitPerUnit: number;     // sellingPrice - productionCost
  profitAtFull: number;      // profitPerUnit * batchSize - fixedCosts
  roiAtFull: number;         // profitAtFull / totalCost * 100
}

export function calcMerchAnalysis(item: MerchItem): MerchAnalysis {
  const totalCost = item.productionCost * item.batchSize + item.fixedCosts;
  const margin = item.sellingPrice - item.productionCost;
  const breakEvenUnits = margin > 0 ? Math.ceil(totalCost / margin) : Infinity;
  const profitPerUnit = margin;
  const profitAtFull = profitPerUnit * item.batchSize - item.fixedCosts;
  const roiAtFull = totalCost > 0 ? (profitAtFull / totalCost) * 100 : 0;
  return { totalCost, breakEvenUnits, profitPerUnit, profitAtFull, roiAtFull };
}
