import { useState } from 'react';
import styles from './InventoryPage.module.css';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  adjustInventoryRequest,
  damageInventoryRequest,
  transferInventoryRequest,
  useInventory,
  useWarehouses
} from '../../api/hooks';
import { useAuthStore } from '../../store/authStore';

export const InventoryPage = () => {
  const user = useAuthStore((state) => state.user);
  const [adminDistributorId, setAdminDistributorId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [adjustPayload, setAdjustPayload] = useState({ productId: '', delta: 0, reason: '' });
  const [transferPayload, setTransferPayload] = useState({
    fromWarehouseId: '',
    toWarehouseId: '',
    productId: '',
    quantity: 0,
    reason: ''
  });
  const [damagePayload, setDamagePayload] = useState({ productId: '', quantity: 0, reason: '' });
  const [message, setMessage] = useState<string | null>(null);
  const requiresDistributor = user?.role === 'admin';

  const distributorScope = requiresDistributor ? adminDistributorId || undefined : user?.distributorId;

  const inventoryQuery = useInventory({
    distributorId: distributorScope,
    warehouseId: warehouseId || undefined
  });
  const warehousesQuery = useWarehouses(
    { distributorId: distributorScope },
    { enabled: requiresDistributor ? Boolean(distributorScope) : true }
  );

  const handleAdjust = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    try {
      await adjustInventoryRequest({
        warehouseId: warehouseId || transferPayload.fromWarehouseId || transferPayload.toWarehouseId,
        distributorId: distributorScope,
        adjustments: [
          {
            productId: adjustPayload.productId,
            delta: adjustPayload.delta,
            reason: adjustPayload.reason
          }
        ]
      });
      setMessage('Adjustment queued');
      void inventoryQuery.refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Adjustment failed');
    }
  };

  const handleTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    try {
      await transferInventoryRequest({
        fromWarehouseId: transferPayload.fromWarehouseId,
        toWarehouseId: transferPayload.toWarehouseId,
        distributorId: distributorScope,
        items: [
          {
            productId: transferPayload.productId,
            quantity: transferPayload.quantity,
            reason: transferPayload.reason
          }
        ]
      });
      setMessage('Transfer recorded');
      void inventoryQuery.refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Transfer failed');
    }
  };

  const handleDamage = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    try {
      await damageInventoryRequest({
        warehouseId: warehouseId || transferPayload.fromWarehouseId,
        distributorId: distributorScope,
        items: [
          {
            productId: damagePayload.productId,
            quantity: damagePayload.quantity,
            reason: damagePayload.reason
          }
        ]
      });
      setMessage('Damage recorded');
      void inventoryQuery.refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Damage update failed');
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Inventory Visibility</p>
          <h3>DC level coverage & multi-tier stock</h3>
        </div>
        <div className={styles.filters}>
          {requiresDistributor && (
            <label>
              Distributor ID
              <input
                value={adminDistributorId}
                onChange={(event) => setAdminDistributorId(event.target.value)}
                placeholder="UUID"
              />
            </label>
          )}
          <label>
            Warehouse ID
            <input
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
              placeholder="Optional warehouse UUID"
            />
          </label>
        </div>
      </div>

      {message && <p className={styles.message}>{message}</p>}
      {inventoryQuery.isLoading && <p className={styles.message}>Loading stock…</p>}
      {inventoryQuery.error instanceof Error && (
        <p className={styles.error}>{inventoryQuery.error.message}</p>
      )}
      {!inventoryQuery.isLoading && !inventoryQuery.data?.length && (
        <p className={styles.message}>No inventory records yet.</p>
      )}

      {inventoryQuery.data && inventoryQuery.data.length > 0 && (
        <div className={styles.table}>
          <div className={styles.head}>
            <span>SKU</span>
            <span>Warehouse</span>
            <span>On hand</span>
            <span>Reserved</span>
            <span>Snapshot</span>
          </div>
          {inventoryQuery.data.map((item: any) => (
            <div key={`${item.warehouseId}-${item.productId}-${item.snapshotTs}`} className={styles.row}>
              <span>{item.sku}</span>
              <span>{item.warehouseName ?? item.warehouseId}</span>
              <span>{item.quantityOnHand}</span>
              <span>{item.quantityReserved}</span>
              <StatusBadge label={new Date(item.snapshotTs).toLocaleString()} tone="info" />
            </div>
          ))}
        </div>
      )}

      <section className={styles.panel}>
        <h4>Warehouses</h4>
        {warehousesQuery.isLoading && <p className={styles.message}>Loading warehouses…</p>}
        {warehousesQuery.error instanceof Error && (
          <p className={styles.error}>{warehousesQuery.error.message}</p>
        )}
        {warehousesQuery.data && warehousesQuery.data.length > 0 && (
          <div className={styles.table}>
            <div className={styles.head}>
              <span>Name</span>
              <span>Code</span>
              <span>Distributor</span>
              <span>Created</span>
            </div>
            {warehousesQuery.data.map((w: any) => (
              <div key={w.id} className={styles.row}>
                <span>{w.name}</span>
                <span>{w.code ?? '—'}</span>
                <span>{w.distributorId ?? '—'}</span>
                <span>{w.createdAt ?? '—'}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.panel}>
        <h4>Adjust stock</h4>
        <form className={styles.form} onSubmit={handleAdjust}>
          <input
            required
            placeholder="Warehouse ID"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          />
          <input
            required
            placeholder="Product ID"
            value={adjustPayload.productId}
            onChange={(e) => setAdjustPayload((p) => ({ ...p, productId: e.target.value }))}
          />
          <input
            type="number"
            placeholder="Delta (+/-)"
            value={adjustPayload.delta}
            onChange={(e) => setAdjustPayload((p) => ({ ...p, delta: Number(e.target.value) }))}
          />
          <input
            placeholder="Reason"
            value={adjustPayload.reason}
            onChange={(e) => setAdjustPayload((p) => ({ ...p, reason: e.target.value }))}
          />
          <button className="btn" type="submit">
            Queue adjustment
          </button>
        </form>
      </section>

      <section className={styles.panel}>
        <h4>Transfer stock</h4>
        <form className={styles.form} onSubmit={handleTransfer}>
          <input
            required
            placeholder="From warehouse ID"
            value={transferPayload.fromWarehouseId}
            onChange={(e) => setTransferPayload((p) => ({ ...p, fromWarehouseId: e.target.value }))}
          />
          <input
            required
            placeholder="To warehouse ID"
            value={transferPayload.toWarehouseId}
            onChange={(e) => setTransferPayload((p) => ({ ...p, toWarehouseId: e.target.value }))}
          />
          <input
            required
            placeholder="Product ID"
            value={transferPayload.productId}
            onChange={(e) => setTransferPayload((p) => ({ ...p, productId: e.target.value }))}
          />
          <input
            type="number"
            placeholder="Quantity"
            value={transferPayload.quantity}
            onChange={(e) => setTransferPayload((p) => ({ ...p, quantity: Number(e.target.value) }))}
          />
          <input
            placeholder="Reason"
            value={transferPayload.reason}
            onChange={(e) => setTransferPayload((p) => ({ ...p, reason: e.target.value }))}
          />
          <button className="btn" type="submit">
            Transfer
          </button>
        </form>
      </section>

      <section className={styles.panel}>
        <h4>Record damage</h4>
        <form className={styles.form} onSubmit={handleDamage}>
          <input
            required
            placeholder="Warehouse ID"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          />
          <input
            required
            placeholder="Product ID"
            value={damagePayload.productId}
            onChange={(e) => setDamagePayload((p) => ({ ...p, productId: e.target.value }))}
          />
          <input
            type="number"
            placeholder="Quantity"
            value={damagePayload.quantity}
            onChange={(e) => setDamagePayload((p) => ({ ...p, quantity: Number(e.target.value) }))}
          />
          <input
            placeholder="Reason"
            value={damagePayload.reason}
            onChange={(e) => setDamagePayload((p) => ({ ...p, reason: e.target.value }))}
          />
          <button className="btn" type="submit">
            Record damage
          </button>
        </form>
      </section>
    </div>
  );
};
