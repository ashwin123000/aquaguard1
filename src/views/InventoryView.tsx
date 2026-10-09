import React, { useMemo, useState } from 'react';
import { useStore, useDemoNow } from '../core/store';
import { NewBatchModal } from '../components/NewBatchModal';
import { Modal } from '../components/Modal';
import { calculateBaseRation, calculateBiomass } from '../core/calculations';
import { formatDemoDate } from '../utils/ids';
import { SPECIES_CONFIGS } from '../core/config';
import type { InventoryBatch, InventoryTransaction } from '../types/inventory';

type InventoryFilter = 'ALL' | 'LOW' | 'EXPIRING' | 'EXPIRED';
type SortBy = 'expiry' | 'name' | 'quantity' | 'status';

const filterLabels: Record<InventoryFilter, string> = {
  ALL: 'All feeds',
  LOW: 'Low stock',
  EXPIRING: 'Expiring soon',
  EXPIRED: 'Expired',
};

function statusForBatch(batch: InventoryBatch): string[] {
  const status: string[] = [];
  if (batch.archived) status.push('Archived');
  if (batch.isExpired) status.push('Expired');
  else if (!batch.expiryDate) status.push('No expiry date');
  else if (batch.isNearExpiry) status.push('Expiring soon');
  if (batch.quantityKg <= 0) status.push('Depleted');
  else if (batch.isLowStock) status.push('Low stock');
  if (batch.quarantined) status.push('Quarantined');
  if (batch.spoiled) status.push('Spoiled');
  if (status.length === 0) status.push('In stock');
  return status;
}

function statusClass(status: string): string {
  if (['Expired', 'Depleted', 'Spoiled'].includes(status)) return 'badge-critical';
  if (['Low stock', 'Expiring soon', 'Quarantined'].includes(status)) return 'badge-warning';
  if (status === 'In stock') return 'badge-optimal';
  return 'badge-info';
}

export function InventoryView() {
  const batches = useStore(state => state.inventoryBatches);
  const transactions = useStore(state => state.inventoryTransactions);
  const ponds = useStore(state => state.ponds);
  const feedItems = useStore(state => state.feedItems);
  const receiveInventoryStock = useStore(state => state.receiveInventoryStock);
  const adjustInventoryStock = useStore(state => state.adjustInventoryStock);
  const assignBatchToPond = useStore(state => state.assignBatchToPond);
  const unassignBatchFromPond = useStore(state => state.unassignBatchFromPond);
  const updateInventoryBatch = useStore(state => state.updateInventoryBatch);
  const addToast = useStore(state => state.addToast);
  const demoNow = useDemoNow();

  const [newBatchModalOpen, setNewBatchModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<InventoryBatch | null>(null);
  const [detailsBatch, setDetailsBatch] = useState<InventoryBatch | null>(null);
  const [receiptBatchId, setReceiptBatchId] = useState<string | null>(null);
  const [adjustBatchId, setAdjustBatchId] = useState<string | null>(null);
  const [assignBatchId, setAssignBatchId] = useState<string | null>(null);
  const [assignPondId, setAssignPondId] = useState<string>(ponds[0]?.id ?? '');
  const [receiptQuantity, setReceiptQuantity] = useState('25');
  const [receiptDate, setReceiptDate] = useState(demoNow.toISOString().slice(0, 10));
  const [receiptReference, setReceiptReference] = useState('');
  const [receiptNotes, setReceiptNotes] = useState('');
  const [adjustQuantity, setAdjustQuantity] = useState('1');
  const [adjustDirection, setAdjustDirection] = useState<'LOSS' | 'CORRECTION'>('LOSS');
  const [adjustReason, setAdjustReason] = useState('Damaged or spoiled feed');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<InventoryFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<SortBy>('expiry');

  const totalDailyFeedConsumptionKg = ponds.reduce((sum, pond) => {
    const liveStock = pond.estimatedLiveStockCount ?? pond.originalStockCount ?? 0;
    const biomass = calculateBiomass(liveStock, pond.meanWeightGrams ?? 200);
    const rate = pond.speciesId ? SPECIES_CONFIGS[pond.speciesId]?.stageFeedingRates[pond.growthStage ?? ''] ?? 0 : 0;
    return sum + calculateBaseRation(biomass, rate);
  }, 0);

  const visibleBatches = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = batches.filter(batch => {
      const matchesFilter = filter === 'ALL' ||
        (filter === 'LOW' && batch.isLowStock) ||
        (filter === 'EXPIRING' && batch.isNearExpiry && !batch.isExpired) ||
        (filter === 'EXPIRED' && batch.isExpired);
      const matchesCategory = categoryFilter === 'ALL' ||
        feedItems.find(item => item.id === batch.feedItemId)?.category === categoryFilter;
      const matchesSearch = !normalizedSearch || [
        batch.feedItemName,
        batch.sku,
        batch.supplier ?? '',
        batch.supplierReference ?? '',
      ].some(value => value.toLowerCase().includes(normalizedSearch));
      return matchesFilter && matchesCategory && matchesSearch;
    });
    return filtered.sort((left, right) => {
      if (sortBy === 'name') return left.feedItemName.localeCompare(right.feedItemName) || left.sku.localeCompare(right.sku);
      if (sortBy === 'quantity') return right.quantityKg - left.quantityKg || left.sku.localeCompare(right.sku);
      if (sortBy === 'status') return Number(right.isLowStock || right.isExpired || right.isNearExpiry) - Number(left.isLowStock || left.isExpired || left.isNearExpiry) || left.sku.localeCompare(right.sku);
      return (left.expiryDate || '9999-12-31').localeCompare(right.expiryDate || '9999-12-31') || left.sku.localeCompare(right.sku);
    });
  }, [batches, categoryFilter, feedItems, filter, search, sortBy]);

  const usableBatches = batches.filter(batch => batch.isAvailable);
  const usableStockKg = usableBatches.reduce((sum, batch) => sum + batch.quantityKg, 0);
  const runwayDays = totalDailyFeedConsumptionKg > 0 ? usableStockKg / totalDailyFeedConsumptionKg : 0;
  const lowStockCount = batches.filter(batch => batch.isLowStock && !batch.archived).length;
  const expiringCount = batches.filter(batch => batch.isNearExpiry && !batch.isExpired && !batch.archived).length;
  const expiredCount = batches.filter(batch => batch.isExpired && !batch.archived).length;
  const categories = [...new Set(feedItems.map(item => item.category))].sort();
  const activeReceiptBatch = batches.find(batch => batch.id === receiptBatchId) ?? null;
  const activeAdjustmentBatch = batches.find(batch => batch.id === adjustBatchId) ?? null;
  const activeAssignmentBatch = batches.find(batch => batch.id === assignBatchId) ?? null;

  const handleReceipt = (event: React.FormEvent) => {
    event.preventDefault();
    if (!receiptBatchId || !receiptDate || !receiptReference.trim()) return;
    const recorded = receiveInventoryStock({
      batchId: receiptBatchId,
      quantityKg: Number(receiptQuantity),
      reason: `Stock receipt — ${receiptReference.trim()}`,
      notes: receiptNotes.trim(),
      receivedAt: `${receiptDate}T12:00:00`,
    });
    if (recorded) setReceiptBatchId(null);
  };

  const handleAdjustment = (event: React.FormEvent) => {
    event.preventDefault();
    if (!adjustBatchId) return;
    const quantity = Number(adjustQuantity);
    const delta = adjustDirection === 'LOSS' ? -quantity : quantity;
    const recorded = adjustInventoryStock({
      batchId: adjustBatchId,
      quantityKg: delta,
      reason: adjustReason.trim(),
      notes: adjustNotes.trim(),
    });
    if (recorded) setAdjustBatchId(null);
  };

  const handleAssign = (event: React.FormEvent) => {
    event.preventDefault();
    if (!assignBatchId || !assignPondId) return;
    const batch = batches.find(item => item.id === assignBatchId);
    const pond = ponds.find(item => item.id === assignPondId);
    const feedItem = batch && feedItems.find(item => item.id === batch.feedItemId);
    if (!batch || !pond || !feedItem || !batch.isAvailable) {
      addToast({ type: 'error', title: 'Batch cannot be assigned', message: 'Choose an available, non-expired batch.', duration: 4000 });
      return;
    }
    if (
      (pond.speciesId && !feedItem.compatibleSpeciesIds.includes(pond.speciesId)) ||
      (pond.growthStage && !feedItem.compatibleStages.includes(pond.growthStage))
    ) {
      addToast({ type: 'error', title: 'Incompatible Feed', message: 'This feed product is not configured for the pond species or growth stage.', duration: 5000 });
      return;
    }
    assignBatchToPond(assignBatchId, assignPondId);
    setAssignBatchId(null);
  };

  const resetFilters = () => {
    setSearch('');
    setFilter('ALL');
    setCategoryFilter('ALL');
    setSortBy('expiry');
  };

  return (
    <div className="inventory-view container py-6">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-extrabold)', margin: 0, color: 'var(--color-text-primary)' }}>Feed Inventory</h1>
            <span className="badge badge-info text-xs">SIMULATED DEMO STOCK</span>
          </div>
          <p className="text-sm text-muted" style={{ margin: 'var(--space-1) 0 0' }}>
            Track batch availability, receipts, expiry, allocations, and stock movements.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setNewBatchModalOpen(true)} id="btn-receive-feed">
          + Add Feed Batch
        </button>
      </header>

      <section aria-label="Inventory summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div className="card card-sm" style={{ padding: 'var(--space-4)' }}>
          <span className="text-xs text-muted">Usable Feed</span>
          <div id="inv-total-stock" style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-teal)' }}>
            {usableStockKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs" style={{ fontWeight: 'normal' }}>kg</span>
          </div>
          <span className="text-xs text-muted">{totalDailyFeedConsumptionKg > 0 ? `Estimated cover: ${runwayDays.toFixed(1)} days` : 'No daily feed demand calculated'}</span>
        </div>
        <div className="card card-sm" style={{ padding: 'var(--space-4)' }}>
          <span className="text-xs text-muted">Low-stock batches</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: lowStockCount > 0 ? 'var(--color-warning)' : 'var(--color-optimal)' }}>
            {lowStockCount}
          </div>
          <span className="text-xs text-muted">At or below their reorder threshold</span>
        </div>
        <div className="card card-sm" style={{ padding: 'var(--space-4)' }}>
          <span className="text-xs text-muted">Expiry watch</span>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'baseline', flexWrap: 'wrap', fontWeight: 'var(--font-bold)' }}>
            <span style={{ color: expiringCount > 0 ? 'var(--color-warning)' : 'var(--color-optimal)' }}>{expiringCount} expiring</span>
            <span className="text-sm" style={{ color: expiredCount > 0 ? 'var(--color-critical)' : 'var(--color-text-muted)' }}>{expiredCount} expired</span>
          </div>
          <span className="text-xs text-muted">Expired feed is excluded from issue allocations</span>
        </div>
      </section>

      <section className="card card-md mb-6" aria-label="Feed batches">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', margin: 0 }}>Feed batches</h2>
            <span className="text-xs text-muted">{visibleBatches.length} of {batches.length} batches · stock issues use FEFO among compatible feed</span>
          </div>
        </div>

        <div role="tablist" aria-label="Filter feed batches" style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
          {(Object.keys(filterLabels) as InventoryFilter[]).map(key => {
            const count = key === 'ALL' ? batches.length :
              key === 'LOW' ? batches.filter(batch => batch.isLowStock && !batch.archived).length :
              key === 'EXPIRING' ? batches.filter(batch => batch.isNearExpiry && !batch.isExpired && !batch.archived).length :
              batches.filter(batch => batch.isExpired && !batch.archived).length;
            return (
              <button key={key} type="button" role="tab" aria-selected={filter === key}
                className={`btn btn-sm ${filter === key ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter(key)}>
                {filterLabels[key]} ({count})
              </button>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="inventory-search">Search inventory</label>
            <input id="inventory-search" className="input" type="search" placeholder="Feed, batch, supplier…" value={search} onChange={event => setSearch(event.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="inventory-category">Feed category</label>
            <select id="inventory-category" className="select" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}>
              <option value="ALL">All categories</option>
              {categories.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="inventory-sort">Sort batches</label>
            <select id="inventory-sort" className="select" value={sortBy} onChange={event => setSortBy(event.target.value as SortBy)}>
              <option value="expiry">Expiry date (FEFO)</option>
              <option value="name">Feed name</option>
              <option value="quantity">Available quantity</option>
              <option value="status">Stock status</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters} disabled={!search && filter === 'ALL' && categoryFilter === 'ALL' && sortBy === 'expiry'}>
              Reset filters
            </button>
          </div>
        </div>

        {visibleBatches.length === 0 ? (
          <div className="card card-sm" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
            <strong>No batches match these filters.</strong>
            <p className="text-sm text-muted" style={{ margin: 'var(--space-2) 0' }}>Clear the search or filters, or add a feed batch to inventory.</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={resetFilters}>Clear filters</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {visibleBatches.map(batch => {
              const assignedPonds = ponds.filter(pond =>
                batch.assignedPondIds?.includes(pond.name) ||
                batch.assignedPondIds?.includes(pond.id) ||
                pond.assignedFeedBatchId === batch.id
              );
              const item = feedItems.find(feedItem => feedItem.id === batch.feedItemId);
              const messages = statusForBatch(batch);
              return (
                <article key={batch.id} id={`batch-row-${batch.id}`} className="card card-sm" style={{ padding: 'var(--space-4)', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                        <h3 style={{ margin: 0, fontSize: 'var(--text-base)' }}>{batch.feedItemName}</h3>
                        <code>{batch.sku}</code>
                        {item && <span className="badge badge-info text-xs">{item.category} · {batch.pelletSizeMm} mm</span>}
                      </div>
                      <div className="text-xs text-muted" style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
                        <span>Supplier: {batch.supplier || 'Not recorded'}</span>
                        <span>Lot: {batch.lotNumber || '—'}</span>
                        <span>Storage: {batch.storageLocation || '—'}</span>
                        <span>Assigned: {assignedPonds.map(pond => pond.name).join(', ') || 'Unassigned'}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: batch.isLowStock ? 'var(--color-critical)' : 'var(--color-teal)' }}>
                        {batch.quantityKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
                      </div>
                      <span className="text-xs text-muted">Minimum {Number(batch.minimumStockKg ?? 50).toFixed(1)} kg</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="text-sm"><strong>Expiry:</strong> {batch.expiryDate || 'Not recorded'}</span>
                      {messages.map(message => <span key={message} className={`badge ${statusClass(message)} text-xs`}>{message}</span>)}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDetailsBatch(batch)}>Details</button>
                      {!batch.archived && <>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingBatch(batch)}>Edit</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => {
                          setReceiptQuantity('25');
                          setReceiptDate(demoNow.toISOString().slice(0, 10));
                          setReceiptReference(batch.supplierReference ?? '');
                          setReceiptNotes('');
                          setReceiptBatchId(batch.id);
                        }}>Receive</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAdjustBatchId(batch.id)}>Adjust</button>
                        {assignedPonds.length > 0 ? (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => unassignBatchFromPond(batch.id, assignedPonds[0].id)}>Unassign</button>
                        ) : (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAssignBatchId(batch.id)} disabled={!batch.isAvailable}>Assign</button>
                        )}
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
                          if (window.confirm(`Archive ${batch.sku}? It will no longer be used for feeding, and its ledger will remain available.`)) {
                            updateInventoryBatch(batch.id, { archived: true });
                            addToast({ type: 'success', title: 'Batch Archived', message: `${batch.sku} remains available in the ledger.`, duration: 3000 });
                          }
                        }}>Archive</button>
                      </>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="card card-md mb-6">
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', margin: '0 0 var(--space-3)' }}>
          Stock movement ledger ({transactions.length})
        </h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted">No stock movements have been recorded yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                  <th style={{ padding: '8px 12px' }}>Date</th>
                  <th style={{ padding: '8px 12px' }}>Movement</th>
                  <th style={{ padding: '8px 12px' }}>Batch</th>
                  <th style={{ padding: '8px 12px' }}>Change</th>
                  <th style={{ padding: '8px 12px' }}>Stock after</th>
                  <th style={{ padding: '8px 12px' }}>Reason / notes</th>
                </tr>
              </thead>
              <tbody>
                {[...transactions].sort((a, b) => b.demoTimestamp.localeCompare(a.demoTimestamp)).slice(0, 30).map(transaction => {
                  const batch = batches.find(item => item.id === transaction.batchId);
                  return (
                    <tr key={transaction.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{formatDemoDate(transaction.demoTimestamp)}</td>
                      <td style={{ padding: '8px 12px' }}><span className="badge badge-info text-xs">{transaction.type.replaceAll('_', ' ')}</span></td>
                      <td style={{ padding: '8px 12px' }}><code>{batch?.sku ?? transaction.batchId}</code></td>
                      <td style={{ padding: '8px 12px', fontWeight: 'var(--font-bold)', color: transaction.quantityKg > 0 ? 'var(--color-optimal)' : 'var(--color-critical)' }}>
                        {transaction.quantityKg > 0 ? '+' : ''}{transaction.quantityKg.toFixed(1)} kg
                      </td>
                      <td style={{ padding: '8px 12px' }}>{transaction.quantityAfterKg === undefined ? '—' : `${transaction.quantityAfterKg.toFixed(1)} kg`}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>
                        {transaction.reason || transaction.notes || '—'}{transaction.mealId ? ` · Meal ${transaction.mealId}` : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <NewBatchModal open={newBatchModalOpen} onClose={() => setNewBatchModalOpen(false)} />
      <NewBatchModal open={!!editingBatch} batchToEdit={editingBatch} onClose={() => setEditingBatch(null)} />

      {activeReceiptBatch && (
        <Modal open onClose={() => setReceiptBatchId(null)} title={`Record Stock Receipt — ${activeReceiptBatch.sku}`}
          footer={<div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', width: '100%' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setReceiptBatchId(null)}>Cancel</button>
            <button type="submit" form="receipt-form" className="btn btn-primary">Record Receipt</button>
          </div>}>
          <form id="receipt-form" onSubmit={handleReceipt}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="receipt-quantity">Quantity received (kg)</label>
                <input id="receipt-quantity" className="input" type="number" min="0.1" step="0.1" value={receiptQuantity} onChange={event => setReceiptQuantity(event.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="receipt-date">Receipt date</label>
                <input id="receipt-date" className="input" type="date" value={receiptDate} onChange={event => setReceiptDate(event.target.value)} required />
              </div>
            </div>
            <div className="form-group mb-4">
              <label className="form-label" htmlFor="receipt-reference">Supplier / reference</label>
              <input id="receipt-reference" className="input" value={receiptReference} onChange={event => setReceiptReference(event.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="receipt-notes">Notes</label>
              <textarea id="receipt-notes" className="input" rows={2} value={receiptNotes} onChange={event => setReceiptNotes(event.target.value)} />
            </div>
          </form>
        </Modal>
      )}

      {activeAdjustmentBatch && (
        <Modal open onClose={() => setAdjustBatchId(null)} title={`Record Stock Adjustment — ${activeAdjustmentBatch.sku}`}
          footer={<div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', width: '100%' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setAdjustBatchId(null)}>Cancel</button>
            <button type="submit" form="adjust-form" className="btn btn-primary">Save Adjustment</button>
          </div>}>
          <form id="adjust-form" onSubmit={handleAdjustment}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="adjust-direction">Adjustment type</label>
                <select id="adjust-direction" className="select" value={adjustDirection} onChange={event => setAdjustDirection(event.target.value as 'LOSS' | 'CORRECTION')}>
                  <option value="LOSS">Loss / damage (decrease)</option>
                  <option value="CORRECTION">Stock correction (increase)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="adjust-kg">Quantity (kg)</label>
                <input id="adjust-kg" className="input" type="number" min="0.1" step="0.1" value={adjustQuantity} onChange={event => setAdjustQuantity(event.target.value)} required />
              </div>
            </div>
            <div className="form-group mb-4">
              <label className="form-label" htmlFor="adjust-reason">Reason</label>
              <input id="adjust-reason" className="input" value={adjustReason} onChange={event => setAdjustReason(event.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="adjust-notes">Notes / source</label>
              <textarea id="adjust-notes" className="input" rows={2} value={adjustNotes} onChange={event => setAdjustNotes(event.target.value)} />
            </div>
          </form>
        </Modal>
      )}

      {activeAssignmentBatch && (
        <Modal open onClose={() => setAssignBatchId(null)} title={`Assign ${activeAssignmentBatch.sku} to Pond`}
          footer={<div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', width: '100%' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setAssignBatchId(null)}>Cancel</button>
            <button type="submit" form="assign-form" className="btn btn-primary">Assign Batch</button>
          </div>}>
          <form id="assign-form" onSubmit={handleAssign}>
            <div className="form-group">
              <label className="form-label" htmlFor="assign-pond-select">Production pond</label>
              <select id="assign-pond-select" className="select" value={assignPondId} onChange={event => setAssignPondId(event.target.value)} required>
                {ponds.map(pond => <option key={pond.id} value={pond.id}>{pond.name} ({pond.speciesName ?? pond.speciesId ?? 'Fish'})</option>)}
              </select>
            </div>
          </form>
        </Modal>
      )}

      {detailsBatch && (
        <Modal open onClose={() => setDetailsBatch(null)} title={`Batch Details — ${detailsBatch.sku}`} size="lg">
          <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
            <div><dt className="text-xs text-muted">Feed product</dt><dd>{detailsBatch.feedItemName} · {detailsBatch.pelletSizeMm} mm</dd></div>
            <div><dt className="text-xs text-muted">Current stock</dt><dd>{detailsBatch.quantityKg.toFixed(1)} kg</dd></div>
            <div><dt className="text-xs text-muted">Reorder threshold</dt><dd>{Number(detailsBatch.minimumStockKg ?? 50).toFixed(1)} kg</dd></div>
            <div><dt className="text-xs text-muted">Expiry</dt><dd>{detailsBatch.expiryDate || 'Not recorded'}</dd></div>
            <div><dt className="text-xs text-muted">Supplier / reference</dt><dd>{detailsBatch.supplier || 'Not recorded'} · {detailsBatch.supplierReference || '—'}</dd></div>
            <div><dt className="text-xs text-muted">Lot / storage</dt><dd>{detailsBatch.lotNumber || '—'} · {detailsBatch.storageLocation || '—'}</dd></div>
            <div><dt className="text-xs text-muted">Created</dt><dd>{formatDemoDate(detailsBatch.demoCreatedAt)}</dd></div>
            <div><dt className="text-xs text-muted">Updated</dt><dd>{formatDemoDate(detailsBatch.demoUpdatedAt)}</dd></div>
          </dl>
          {detailsBatch.notes && <p className="text-sm">{detailsBatch.notes}</p>}
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => updateInventoryBatch(detailsBatch.id, { quarantined: !detailsBatch.quarantined })}>
              {detailsBatch.quarantined ? 'Remove quarantine' : 'Quarantine batch'}
            </button>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => updateInventoryBatch(detailsBatch.id, { spoiled: !detailsBatch.spoiled })}>
              {detailsBatch.spoiled ? 'Clear spoiled status' : 'Mark spoiled'}
            </button>
          </div>
          <h3 style={{ fontSize: 'var(--text-base)' }}>Batch movement history</h3>
          {transactions.filter(transaction => transaction.batchId === detailsBatch.id).length === 0 ? (
            <p className="text-sm text-muted">No movements recorded.</p>
          ) : transactions.filter(transaction => transaction.batchId === detailsBatch.id)
            .sort((a: InventoryTransaction, b: InventoryTransaction) => b.demoTimestamp.localeCompare(a.demoTimestamp))
            .map(transaction => (
              <div key={transaction.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', borderTop: '1px solid var(--color-border)', padding: 'var(--space-2) 0' }}>
                <span className="text-sm">{formatDemoDate(transaction.demoTimestamp)} · {transaction.reason}</span>
                <strong className="text-sm">{transaction.quantityKg > 0 ? '+' : ''}{transaction.quantityKg.toFixed(1)} kg</strong>
              </div>
            ))}
        </Modal>
      )}
    </div>
  );
}
