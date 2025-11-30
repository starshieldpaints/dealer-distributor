import styles from './IntegrationsPage.module.css';

const connectors = [
  {
    name: 'SAP S/4HANA',
    status: 'Connected',
    sync: '15 mins ago',
    scope: 'Orders + Credit'
  },
  {
    name: 'Salesforce',
    status: 'Connected',
    sync: '3 mins ago',
    scope: 'Accounts + Retailers'
  },
  {
    name: 'MS Dynamics',
    status: 'Pending Auth',
    sync: '—',
    scope: 'Ledger'
  }
];

export const IntegrationsPage = () => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Integration Hub</p>
          <h3>ERP + CRM connectors</h3>
        </div>
        <button className="btn">Add connector</button>
      </div>

      <div className={styles.list}>
        {connectors.map((connector) => (
          <div key={connector.name} className={styles.card}>
            <div>
              <h4>{connector.name}</h4>
              <p>{connector.scope}</p>
            </div>
            <div className={styles.meta}>
              <span className={connector.status === 'Connected' ? styles.good : styles.bad}>
                {connector.status}
              </span>
              <small>Last sync {connector.sync}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
