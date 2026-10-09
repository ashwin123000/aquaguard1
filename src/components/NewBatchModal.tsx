import React, { useEffect, useState } from 'react';
import { useStore } from '../core/store';
import { Modal } from './Modal';
import type { InventoryBatch } from '../types/inventory';

interface NewBatchModalProps {
  open: boolean;
  onClose: () => void;
  batchToEdit?: InventoryBatch | null;
}

export function NewBatchModal({ open, onClose, batchToEdit }: NewBatchModalProps) {
  const addInventoryBatch = useStore(state => state.addInventoryBatch);
  const updateInventoryBatch = useStore(state => state.updateInventoryBatch);
  const feedItems = useStore(state => state.feedItems);
  const [feedItemId, setFeedItemId] = useState<string>(feedItems[0]?.id ?? '');
  const [sku, setSku] = useState<string>('');
  const [quantityKg, setQuantityKg] = useState<string>('200');
  const [minimumStockKg, setMinimumStockKg] = useState<string>('50');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [supplier, setSupplier] = useState<string>('');
  const [supplierReference, setSupplierReference] = useState<string>('');
  const [lotNumber, setLotNumber] = useState<string>('');
  const [storageLocation, setStorageLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    if (batchToEdit) {
      setFeedItemId(batchToEdit.feedItemId);
      setSku(batchToEdit.sku);
      setQuantityKg(String(batchToEdit.quantityKg));
      setMinimumStockKg(String(batchToEdit.minimumStockKg ?? 50));
      setExpiryDate(batchToEdit.expiryDate);
      setSupplier(batchToEdit.supplier ?? '');
      setSupplierReference(batchToEdit.supplierReference ?? '');
      setLotNumber(batchToEdit.lotNumber ?? '');
      setStorageLocation(batchToEdit.storageLocation ?? '');
      setNotes(batchToEdit.notes);
    } else {
      setFeedItemId(feedItems[0]?.id ?? '');
      setSku(`BATCH-${Math.floor(1000 + Math.random() * 9000)}`);
      setQuantityKg('200');
      setMinimumStockKg('50');
      setExpiryDate('');
      setSupplier('');
      setSupplierReference('');
      setLotNumber('');
      setStorageLocation('');
      setNotes('');
    }
  }, [open, batchToEdit, feedItems]);

  const selectedItem = feedItems.find(item => item.id === feedItemId);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const quantity = Number(quantityKg);
    const reorderThreshold = Number(minimumStockKg);
    if (!sku.trim() || !selectedItem || !Number.isFinite(reorderThreshold) || reorderThreshold < 0) return;

    const metadata = {
      feedItemId: selectedItem.id,
      feedItemName: selectedItem.name,
      sku: sku.trim(),
      pelletSizeMm: selectedItem.pelletSizeMm,
      expiryDate,
      minimumStockKg: reorderThreshold,
      supplier: supplier.trim(),
      supplierReference: supplierReference.trim(),
      lotNumber: lotNumber.trim(),
      storageLocation: storageLocation.trim(),
      notes: notes.trim(),
    };

    if (batchToEdit) {
      if (updateInventoryBatch(batchToEdit.id, metadata)) onClose();
    } else {
      if (!Number.isFinite(quantity) || quantity <= 0) return;
      const added = addInventoryBatch({
        ...metadata,
        quantityKg: quantity,
        assignedPondIds: [],
      });
      if (added) onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={batchToEdit ? `Edit Batch — ${batchToEdit.sku}` : 'Receive Feed Shipment'}
      size="lg"
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', width: '100%' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="new-batch-form" className="btn btn-primary" id="btn-add-batch">
            {batchToEdit ? 'Save Batch Details' : 'Add Feed Batch'}
          </button>
        </div>
      }
    >
      <form id="new-batch-form" onSubmit={handleSubmit}>
        <div className="form-group mb-4">
          <label className="form-label" htmlFor="feed-catalog-select">Feed Product</label>
          <select
            id="feed-catalog-select"
            className="select"
            value={feedItemId}
            onChange={event => setFeedItemId(event.target.value)}
            disabled={!!batchToEdit}
            required
          >
            {feedItems.map(item => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.pelletSizeMm}mm, {item.category})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="batch-sku-input">Batch Number / SKU</label>
            <input id="batch-sku-input" type="text" className="input" value={sku} onChange={event => setSku(event.target.value)} required />
          </div>
          {!batchToEdit && (
            <div className="form-group">
              <label className="form-label" htmlFor="batch-quantity">Initial Quantity (kg)</label>
              <input id="batch-quantity" type="number" min="0.1" step="0.1" className="input" value={quantityKg} onChange={event => setQuantityKg(event.target.value)} required />
            </div>
          )}
          <div className="form-group">
            <label className="form-label" htmlFor="minimum-stock">Low-stock threshold (kg)</label>
            <input id="minimum-stock" type="number" min="0" step="0.1" className="input" value={minimumStockKg} onChange={event => setMinimumStockKg(event.target.value)} required />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="batch-expiry">Expiry date</label>
            <input id="batch-expiry" type="date" className="input" value={expiryDate} onChange={event => setExpiryDate(event.target.value)} />
            <span className="text-xs text-muted">Leave blank if no expiry date is recorded.</span>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="batch-supplier">Supplier</label>
            <input id="batch-supplier" type="text" className="input" value={supplier} onChange={event => setSupplier(event.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="batch-reference">Supplier / receipt reference</label>
            <input id="batch-reference" type="text" className="input" value={supplierReference} onChange={event => setSupplierReference(event.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="batch-lot">Lot number</label>
            <input id="batch-lot" type="text" className="input" value={lotNumber} onChange={event => setLotNumber(event.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="batch-storage">Storage location</label>
            <input id="batch-storage" type="text" className="input" value={storageLocation} onChange={event => setStorageLocation(event.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="batch-notes">Notes</label>
          <textarea id="batch-notes" rows={2} className="input" value={notes} onChange={event => setNotes(event.target.value)} />
        </div>
      </form>
    </Modal>
  );
}
