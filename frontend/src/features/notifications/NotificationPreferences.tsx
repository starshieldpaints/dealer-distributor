import styles from './NotificationPreferences.module.css';
import { useState } from 'react';

const DEFAULT_PREFERENCES = {
  reminders: true,
  creditHolds: true,
  schemes: false,
  channel: 'email'
};

export const NotificationPreferences = () => {
  const [prefs, setPrefs] = useState(DEFAULT_PREFERENCES);

  const toggle = (key: keyof typeof DEFAULT_PREFERENCES) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className={styles.panel}>
      <h4>Notification Preferences</h4>
      <p className={styles.hint}>Backend integration pending — values are local only.</p>
      <label className={styles.row}>
        <input type="checkbox" checked={prefs.reminders} onChange={() => toggle('reminders')} />
        Payment reminders
      </label>
      <label className={styles.row}>
        <input type="checkbox" checked={prefs.creditHolds} onChange={() => toggle('creditHolds')} />
        Credit hold alerts
      </label>
      <label className={styles.row}>
        <input type="checkbox" checked={prefs.schemes} onChange={() => toggle('schemes')} />
        Scheme notifications
      </label>
      <label className={styles.row}>
        Channel:
        <select
          value={prefs.channel}
          onChange={(event) => setPrefs((prev) => ({ ...prev, channel: event.target.value }))}
        >
          <option value="email">Email</option>
          <option value="sms">SMS (coming soon)</option>
          <option value="push">Push (mobile)</option>
        </select>
      </label>
    </div>
  );
};
