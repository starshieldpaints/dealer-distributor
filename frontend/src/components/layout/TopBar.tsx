// import { LuBell, LuLogOut, LuSearch, LuSignalHigh } from 'react-icons/lu';
// import { useUiStore } from '../../store/uiStore';
// import { useAuthStore } from '../../store/authStore';
// import styles from './TopBar.module.css';

// export const TopBar = () => {
//   const role = useUiStore((state) => state.role);
//   const user = useAuthStore((state) => state.user);
//   const logout = useAuthStore((state) => state.logout);
//   const personaLabel =
//     role === 'hq'
//       ? 'Central HQ'
//       : role === 'distributor'
//         ? 'Distributor Ops'
//         : role === 'dealer'
//           ? 'Dealer Ops'
//           : 'Field Team';

//   return (
//     <header className={styles.topbar}>
//       <div>
//         <p className={styles.kicker}>Realtime Control Center</p>
//         <h2>{personaLabel}</h2>
//       </div>

//       <div className={styles.actions}>
//         <div className={styles.search}>
//           <LuSearch />
//           <input placeholder="Search orders, retailers, SKUs" />
//         </div>
//         <button className="btn secondary">
//           <LuSignalHigh />
//           Live Sync
//         </button>
//         <button className={styles.iconButton}>
//           <LuBell />
//         </button>
//         <div className={styles.avatar}>{user ? user.name.slice(0, 2).toUpperCase() : 'NA'}</div>
//         <button className={`${styles.iconButton} ${styles.logout}`} onClick={logout} title="Logout">
//           <LuLogOut />
//         </button>
//       </div>
//     </header>
//   );
// };

import { useAuthStore } from '../../store/authStore';
import { LuLogOut, LuUser, LuBell } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import styles from './TopBar.module.css';

export const TopBar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProfileClick = () => {
    if (user) {
      navigate(`/portal/${user.id}/profile`);
    }
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        {/* Breadcrumbs or Title could go here */}
      </div>
      
      <div className={styles.right}>
        <button className={styles.iconBtn} aria-label="Notifications">
          <LuBell />
          <span className={styles.badge}>2</span>
        </button>

        <div className={styles.divider} />

        <div className={styles.user} onClick={handleProfileClick} role="button" tabIndex={0}>
          <div className={styles.avatar}>
            <LuUser />
          </div>
          <div className={styles.userInfo}>
            <span className={styles.name}>{user?.name}</span>
            <span className={styles.role}>{user?.role?.replace('_', ' ')}</span>
          </div>
        </div>

        <button 
          className={styles.logoutBtn} 
          onClick={handleLogout}
          title="Sign Out"
        >
          <LuLogOut />
        </button>
      </div>
    </header>
  );
};