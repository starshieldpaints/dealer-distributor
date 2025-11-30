import { NavLink } from 'react-router-dom';
import { LuLayoutDashboard, LuClipboardList, LuCreditCard, LuMap, LuPackage, LuSettings, LuUsers } from 'react-icons/lu';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import styles from './SidebarNav.module.css';

const baseNavItems = [
  { to: '/', label: 'Insight Hub', icon: <LuLayoutDashboard /> },
  { to: '/orders', label: 'Orders', icon: <LuClipboardList /> },
  { to: '/products', label: 'Products', icon: <LuPackage /> },
  { to: '/inventory', label: 'Inventory', icon: <LuPackage /> },
  { to: '/credit', label: 'Credit', icon: <LuCreditCard /> },
  { to: '/schemes', label: 'Schemes', icon: <LuSettings /> },
  { to: '/secondary-sales', label: 'Secondary Sales', icon: <LuClipboardList /> },
  { to: '/field', label: 'Field Ops', icon: <LuMap /> },
  { to: '/profile', label: 'Profile', icon: <LuUsers /> }
];

export const SidebarNav = () => {
  const role = useUiStore((state) => state.role);
  const setRole = useUiStore((state) => state.setRole);
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';

  const navForRole = (uiRole: string) => {
    switch (uiRole) {
      case 'field':
        return baseNavItems.filter((item) =>
          ['/','/field','/secondary-sales','/profile'].includes(item.to)
        );
      case 'dealer':
        return baseNavItems.filter((item) =>
          ['/','/orders','/products','/inventory','/schemes','/profile'].includes(item.to)
        );
      case 'distributor':
        return baseNavItems.filter((item) =>
          ['/','/orders','/products','/inventory','/credit','/schemes','/secondary-sales','/field','/profile'].includes(item.to)
        );
      default:
        return baseNavItems;
    }
  };

  const navItems = navForRole(role);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.logo}>DD</div>
        <div>
          <h1>DDMS</h1>
          <p>Dealer OS</p>
        </div>
      </div>

      <div className={styles.roleSwitcher}>
        <span>Role view</span>
        {isAdmin ? (
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as any)}
          >
            <option value="hq">Admin</option>
            <option value="distributor">Distributor</option>
            <option value="dealer">Dealer</option>
            <option value="field">Field Rep</option>
          </select>
        ) : (
          <div className={styles.roleReadonly}>{role}</div>
        )}
        {!isAdmin && <small>Role fixed by your login</small>}
      </div>

      <nav className={styles.nav}>
        {navItems
          .concat(
            user && (user.role === 'dealer' || user.role === 'distributor' || user.role === 'admin')
              ? [{ to: '/team', label: 'Team', icon: <LuUsers /> }]
              : []
          )
          .concat(
            user?.role === 'admin'
              ? [{ to: '/admin/approvals', label: 'Approvals', icon: <LuUsers /> }]
              : []
          )
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
      </nav>
    </aside>
  );
};
