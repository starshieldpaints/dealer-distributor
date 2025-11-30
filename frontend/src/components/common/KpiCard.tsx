import styles from './KpiCard.module.css';

interface Props {
  title: string;
  value: string;
  delta: string;
  trend?: 'up' | 'down';
  subtitle?: string;
}


export const KpiCard = ({ title, value, delta, trend = 'up', subtitle }: Props) => {
  return (
    <div className={styles.card}>
      <p className={styles.title}>{title}</p>
      <h3>{value}</h3>
      <p className={`${styles.delta} ${trend === 'down' ? styles.down : styles.up}`}>{delta}</p>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );
};
