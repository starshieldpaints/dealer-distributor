import styles from './ReturnsPanel.module.css';
import { useOrderReturns } from '../../api/hooks';
import { useAuthStore } from '../../store/authStore';
import { useState } from 'react';

export const ReturnsPanel = () => {
  const user = useAuthStore((state) => state.user);
  const [adminDistributorId, setAdminDistributorId] = useState('');
  const distributorId =
    user?.role === 'admin' ? adminDistributorId || undefined : user?.distributorId ?? undefined;

  const returnsQuery = useOrderReturns(
    { distributorId, limit: 10 },
    { enabled: Boolean(distributorId) }
  );

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h4>Recent Returns</h4>
        {user?.role === 'admin' && (
          <input
            value={adminDistributorId}
            onChange={(event) => setAdminDistributorId(event.target.value)}
            placeholder="Distributor UUID"
          />
        )}
      </div>
      {returnsQuery.isLoading && <p className={styles.message}>Loading returns…</p>}
      {returnsQuery.error instanceof Error && <p className={styles.error}>{returnsQuery.error.message}</p>}
      <div className={styles.list}>
        {returnsQuery.data?.map((ret: any) => (
          <div key={ret.id} className={styles.item}>
            <div>
              <strong>Order {ret.parentOrderId}</strong>
              <p>{ret.reason}</p>
            </div>
            <div>
              <p>${ret.refundAmount}</p>
              <small>{new Date(ret.createdAt).toLocaleDateString()}</small>
            </div>
          </div>
        ))}
        {!returnsQuery.isLoading && !returnsQuery.data?.length && (
          <p className={styles.message}>No returns recorded.</p>
        )}
      </div>
    </div>
  );
};
