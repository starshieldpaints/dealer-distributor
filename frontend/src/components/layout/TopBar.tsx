import { LuBell, LuLogOut, LuSearch, LuSignalHigh } from 'react-icons/lu';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import styles from './TopBar.module.css';

export const TopBar = () => {
  const role = useUiStore((state) => state.role);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const personaLabel =
    role === 'hq'
      ? 'Central HQ'
      : role === 'distributor'
        ? 'Distributor Ops'
        : role === 'dealer'
          ? 'Dealer Ops'
          : 'Field Team';

  return (
    <header className={styles.topbar}>
      <div>
        <p className={styles.kicker}>Realtime Control Center</p>
        <h2>{personaLabel}</h2>
      </div>

      <div className={styles.actions}>
        <div className={styles.search}>
          <LuSearch />
          <input placeholder="Search orders, retailers, SKUs" />
        </div>
        <button className="btn secondary">
          <LuSignalHigh />
          Live Sync
        </button>
        <button className={styles.iconButton}>
          <LuBell />
        </button>
        <div className={styles.avatar}>{user ? user.name.slice(0, 2).toUpperCase() : 'NA'}</div>
        <button className={`${styles.iconButton} ${styles.logout}`} onClick={logout} title="Logout">
          <LuLogOut />
        </button>
      </div>
    </header>
  );
};
