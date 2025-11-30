import styles from './NotificationsPanel.module.css';
import { useNotifications } from '../../api/hooks';
import { useAuthStore } from '../../store/authStore';
import { useState } from 'react';

export const NotificationsPanel = () => {
  const user = useAuthStore((state) => state.user);
  const [adminDistributorId, setAdminDistributorId] = useState('');
  const distributorId =
    user?.role === 'admin' ? adminDistributorId || undefined : user?.distributorId ?? undefined;

  const notificationsQuery = useNotifications(
    { distributorId, limit: 10 },
    Boolean(distributorId)
  );

  if (user?.role === 'admin' && !distributorId) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h4>Notifications</h4>
          <input
            value={adminDistributorId}
            onChange={(event) => setAdminDistributorId(event.target.value)}
            placeholder="Distributor UUID"
          />
        </div>
        <p className={styles.message}>Enter a distributor ID to view notifications.</p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h4>Notifications</h4>
        {user?.role === 'admin' && (
          <input
            value={adminDistributorId}
            onChange={(event) => setAdminDistributorId(event.target.value)}
            placeholder="Distributor UUID"
          />
        )}
      </div>
      {notificationsQuery.isLoading && <p className={styles.message}>Loading notifications…</p>}
      {notificationsQuery.error instanceof Error && (
        <p className={styles.error}>{notificationsQuery.error.message}</p>
      )}
      <div className={styles.list}>
        {notificationsQuery.data?.map((notification: any) => (
          <div key={notification.id} className={styles.item}>
            <p>
              <strong>{notification.reminderType}</strong> · due{' '}
              {notification.dueDate ? new Date(notification.dueDate).toLocaleDateString() : '—'}
            </p>
            <small>{new Date(notification.sentAt).toLocaleString()}</small>
          </div>
        ))}
        {!notificationsQuery.isLoading && !notificationsQuery.data?.length && (
          <p className={styles.message}>No notifications yet.</p>
        )}
      </div>
    </div>
  );
};
