import clsx from 'clsx';
import styles from './StatusBadge.module.css';

type Tone = 'success' | 'warning' | 'info' | 'danger';

interface Props {
  label: string;
  tone?: Tone;
}

export const StatusBadge = ({ label, tone = 'info' }: Props) => {
  return <span className={clsx(styles.badge, styles[tone])}>{label}</span>;
};
