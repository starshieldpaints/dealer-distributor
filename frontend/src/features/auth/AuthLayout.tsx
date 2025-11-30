import { type ReactNode } from 'react';
import styles from './AuthLayout.module.css';

interface Props {
  children: ReactNode;
}

export const AuthLayout = ({ children }: Props) => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.panel}>
        <div className={styles.brand}>
          <div className={styles.logo}>DD</div>
          <div>
            <p>Dealer & Distributor OS</p>
            <h1>Sign in to control tower</h1>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};
