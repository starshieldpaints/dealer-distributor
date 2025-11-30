import { useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '../../components/common/StatusBadge';
import styles from './OrdersPage.module.css';
import { OrderDrawer } from './components/OrderDrawer';
import { useOrders, useCreditHolds, createReturnRequest } from '../../api/hooks';
import { useAuthStore } from '../../store/authStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ReturnsPanel } from './ReturnsPanel';
import { useLocation } from 'react-router-dom';

const statuses = ['all', 'submitted', 'approved', 'dispatched', 'delivered'];

export const OrdersPage = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [adminDistributorId, setAdminDistributorId] = useState('');
  const user = useAuthStore((state) => state.user);
  const requiresDistributor = user?.role === 'admin';
  const queryClient = useQueryClient();
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null);
  const returnForm = useForm<{ reason: string; refundAmount: number }>();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlStatus = params.get('status');
    const urlDistributor = params.get('distributorId');
    if (urlStatus && statuses.includes(urlStatus)) {
      setStatusFilter(urlStatus);
    }
    if (requiresDistributor && urlDistributor) {
      setAdminDistributorId(urlDistributor);
    }
  }, [location.search, requiresDistributor]);

  const returnMutation = useMutation({
    mutationFn: (payload: { orderId: string; reason: string; refundAmount: number }) =>
      createReturnRequest(payload.orderId, { reason: payload.reason, refundAmount: payload.refundAmount }),
    onSuccess: () => {
      setReturnOrderId(null);
      returnForm.reset({ reason: '', refundAmount: 0 });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  const queryParams = useMemo(() => {
    return {
      distributorId: requiresDistributor ? adminDistributorId || undefined : undefined,
      status: statusFilter === 'all' ? undefined : statusFilter
    };
  }, [requiresDistributor, adminDistributorId, statusFilter]);

  const ordersQuery = useOrders(queryParams, {
    enabled: !requiresDistributor || Boolean(adminDistributorId)
  });
  const creditHoldsQuery = useCreditHolds({ enabled: requiresDistributor });

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Order Control Tower</p>
          <h3>Monitor every hop from distributor to retailer</h3>
        </div>
        <button className="btn" onClick={() => setDrawerOpen(true)}>
          Create order
        </button>
      </div>

      {requiresDistributor && (
        <div className={styles.adminFilter}>
          <label>
            Distributor ID
            <input
              value={adminDistributorId}
              onChange={(event) => setAdminDistributorId(event.target.value)}
              placeholder="UUID of distributor"
            />
          </label>
        </div>
      )}

      <div className={styles.toolbar}>
        {statuses.map((status) => (
          <button
            key={status}
            className={`${styles.chip} ${statusFilter === status ? styles.active : ''}`}
            onClick={() => setStatusFilter(status)}
          >
            {status}
          </button>
        ))}
      </div>

      {ordersQuery.isLoading && <p className={styles.message}>Loading orders…</p>}
      {ordersQuery.error instanceof Error && (
        <p className={styles.error}>{ordersQuery.error.message}</p>
      )}
      {!ordersQuery.isLoading && !ordersQuery.data?.length && (
        <p className={styles.message}>No orders yet.</p>
      )}

      {ordersQuery.data && ordersQuery.data.length > 0 && (
        <div className={styles.table}>
          <div className={styles.head}>
            <span>ID</span>
            <span>Distributor</span>
            <span>Retailer</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Created</span>
          </div>
          {ordersQuery.data.map((order: any) => (
            <div key={order.id} className={styles.row}>
              <span>{order.id}</span>
              <span>{order.distributorId ?? '—'}</span>
              <span>{order.retailerId ?? '—'}</span>
              <span>${Number(order.totalAmount ?? 0).toLocaleString()}</span>
              <StatusBadge label={order.status} />
              <span>{new Date(order.createdAt).toLocaleString()}</span>
              {order.status === 'delivered' && (
                <button className={styles.returnButton} onClick={() => setReturnOrderId(order.id)}>
                  Return
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {requiresDistributor && creditHoldsQuery.data?.length > 0 && (
        <div className={styles.holdPanel}>
          <h4>Credit Holds</h4>
          {creditHoldsQuery.data.map((hold: any) => (
            <div key={hold.id} className={styles.holdRow}>
              <span>{hold.id}</span>
              <span>${Number(hold.totalAmount ?? 0).toLocaleString()}</span>
              <span>{new Date(hold.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {returnOrderId && (
        <div className={styles.returnDrawer}>
          <div className={styles.returnCard}>
            <header>
              <h4>Return Order {returnOrderId}</h4>
              <button className={styles.close} onClick={() => setReturnOrderId(null)}>
                ×
              </button>
            </header>
            <form
              onSubmit={returnForm.handleSubmit(async (values) => {
                await returnMutation.mutateAsync({
                  orderId: returnOrderId,
                  reason: values.reason,
                  refundAmount: Number(values.refundAmount)
                });
              })}
            >
              <label>
                Reason
                <textarea {...returnForm.register('reason', { required: true })} rows={3} />
              </label>
              <label>
                Refund Amount
                <input
                  type="number"
                  step="0.01"
                  {...returnForm.register('refundAmount', { required: true, min: 0 })}
                />
              </label>
              {returnMutation.error instanceof Error && (
                <p className={styles.error}>{returnMutation.error.message}</p>
              )}
              <footer>
                <button type="button" className="btn secondary" onClick={() => setReturnOrderId(null)}>
                  Cancel
                </button>
                <button className="btn" type="submit" disabled={returnMutation.isPending}>
                  {returnMutation.isPending ? 'Submitting…' : 'Submit Return'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      <OrderDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <ReturnsPanel />
    </div>
  );
};
