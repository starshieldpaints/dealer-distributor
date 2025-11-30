import styles from './ProfilePage.module.css';
import { useAuthStore } from '../../store/authStore';
import { VerificationBanner } from '../../components/auth/VerificationBanner';

export const ProfilePage = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <div className={styles.wrapper}>
      <VerificationBanner />

      <section className={styles.card}>
        <div className={styles.item}>
          <span className={styles.label}>Name</span>
          <span className={styles.value}>{user?.name ?? '-'}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Email</span>
          <span className={styles.value}>{user?.email ?? '-'}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Role</span>
          <span className={styles.value}>{user?.role ?? '-'}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Distributor</span>
          <span className={styles.value}>{user?.distributorId ?? '—'}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Status</span>
          <span className={styles.value}>{user?.status ?? '-'}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Approval</span>
          <span className={styles.value}>{user?.approvalStatus ?? '-'}</span>
        </div>
      </section>
    </div>
  );
};
