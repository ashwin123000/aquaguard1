export interface FeedItem {
  id: string;
  name: string;
  pelletSizeMm: number;
  category: string; // e.g. 'FLOATING', 'SINKING', 'CRUMBLE'
  compatibleSpeciesIds: string[];
  compatibleStages: string[];
  defaultBagSizeKg: number;
}

export interface InventoryBatch {
  id: string;
  feedItemId: string;
  feedItemName: string;
  sku: string;
  pelletSizeMm: number;
  quantityKg: number;
  expiryDate: string; // ISO date
  minimumStockKg?: number;
  supplier?: string;
  supplierReference?: string;
  lotNumber?: string;
  storageLocation?: string;
  archived?: boolean;
  quarantined?: boolean;
  spoiled?: boolean;
  assignedPondIds: string[];
  notes: string;
  isExpired: boolean; // computed from demo clock
  isLowStock: boolean; // computed
  isNearExpiry: boolean; // computed
  isAvailable: boolean;
  demoCreatedAt: string;
  demoUpdatedAt: string;
}

export interface InventoryTransaction {
  id: string;
  batchId: string;
  pondId: string | null;
  mealId: string | null;
  type: 'INITIAL_RECEIPT' | 'RECEIPT' | 'ISSUE' | 'LOSS' | 'RETURN' | 'DEDUCTION' | 'ADDITION' | 'ADJUSTMENT' | 'CORRECTION';
  quantityKg: number; // positive = added, negative = deducted
  quantityAfterKg?: number;
  reason: string;
  notes: string;
  demoTimestamp: string;
}
