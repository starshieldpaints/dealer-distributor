import { type ReactNode } from 'react';
import { SidebarNav } from './SidebarNav';
import { TopBar } from './TopBar';
import styles from './AppShell.module.css';

interface Props {
  children: ReactNode;
}

export const AppShell = ({ children }: Props) => {
  return (
    <div className={styles.shell}>
      <SidebarNav />
      <div className={styles.main}>
        <TopBar />
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
};
