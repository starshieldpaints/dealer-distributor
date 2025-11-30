import { useMemo, useState } from 'react';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { KpiCard } from '../../components/common/KpiCard';
import styles from './DashboardPage.module.css';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  useCreditLedger,
  useDashboardMetrics,
  useInventory,
  useOrders,
  useSchemes,
  useUserSearch
} from '../../api/hooks';
import { NotificationsPanel } from '../notifications/NotificationsPanel';
import { NotificationPreferences } from '../notifications/NotificationPreferences';
import { useNavigate } from 'react-router-dom';

const pipelineStatuses = ['submitted', 'approved', 'dispatched', 'delivered', 'rejected', 'on_hold'];

export const DashboardPage = () => {
  const uiRole = useUiStore((state) => state.role);
  const authUser = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    distributorQuery: '',
    distributorId: '',
    region: '',
    state: '',
    country: '',
    timeRange: '7d'
  });
  const [adminDistributorId, setAdminDistributorId] = useState('');
  const requiresDistributor = authUser?.role === 'admin';
  const distributorId = requiresDistributor
    ? adminDistributorId || undefined
    : authUser?.distributorId ?? undefined;
  const distributorMissing = requiresDistributor && !distributorId;

  const userSearch = useUserSearch(filters.distributorQuery, ['distributor']);
  const metricsQuery = useDashboardMetrics(
    { distributorId },
    { enabled: Boolean(distributorId) }
  );
  const ordersQuery = useOrders(
    { distributorId },
    { enabled: Boolean(distributorId) }
  );
  const inventoryQuery = useInventory(
    { distributorId },
    { enabled: Boolean(distributorId) }
  );
  const creditLedgerQuery = useCreditLedger(distributorId, {
    enabled: Boolean(distributorId),
    limit: 5
  });
  const schemesQuery = useSchemes({ status: 'active' });

  const pipeline = useMemo(() => {
    const counts: Record<string, number> = {};
    pipelineStatuses.forEach((s) => (counts[s] = 0));
    ordersQuery.data?.forEach((order: any) => {
      const key = (order.status ?? '').toLowerCase();
      if (counts[key] !== undefined) counts[key] += 1;
    });
    return counts;
  }, [ordersQuery.data]);

  const kpiCards = useMemo(() => {
    if (!metricsQuery.data) return [];
    const totalSales = metricsQuery.data.totalAmount ?? 0;
    const orders = metricsQuery.data.totalOrders ?? 0;
    const avgOrder = orders > 0 ? totalSales / orders : 0;
    return [
      { title: 'Total Sales', value: `$${totalSales.toLocaleString()}`, delta: 'This period', trend: 'up' },
      { title: 'Avg Order', value: `$${avgOrder.toFixed(0)}`, delta: 'Orders', trend: 'neutral' },
      { title: 'Orders', value: `${orders}`, delta: 'All statuses', trend: 'up' },
      { title: 'Fill Rate', value: `${Math.round((metricsQuery.data.fillRate ?? 0) * 100)}%`, delta: 'Live', trend: 'up' },
      { title: 'Return Rate', value: `${Math.round((metricsQuery.data.returnRate ?? 0) * 100)}%`, delta: 'Live', trend: 'down' },
      { title: 'Outstanding Credit', value: `$${(metricsQuery.data.outstandingCredit ?? 0).toLocaleString()}`, delta: 'Snapshot', trend: 'warning' }
    ];
  }, [metricsQuery.data]);

  return (
    <div className={styles.wrapper}>
      {requiresDistributor && (
        <div className={styles.adminFilter}>
          <div className={styles.filterField}>
            <label>Distributor (search by name/email/ID)</label>
            <input
              value={filters.distributorQuery}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, distributorQuery: event.target.value }))
              }
              placeholder="Type to search"
            />
            {userSearch.isFetching && <p className={styles.message}>Searching…</p>}
            {userSearch.data && userSearch.data.length > 0 && (
              <div className={styles.suggestions}>
                {userSearch.data.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        distributorQuery: user.name ?? user.email ?? user.id,
                        distributorId: user.distributorId ?? user.id
                      }))
                    }
                  >
                    <span>{user.name ?? user.email ?? user.id}</span>
                    <small>{user.email}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="btn"
            type="button"
            onClick={() => setAdminDistributorId((filters.distributorId || filters.distributorQuery).trim())}
            disabled={!filters.distributorId.trim() && !filters.distributorQuery.trim()}
          >
            Apply scope
          </button>
        </div>
      )}

      <div className={styles.filterBar}>
        <label>
          Time range
          <select
            value={filters.timeRange}
            onChange={(e) => setFilters((prev) => ({ ...prev, timeRange: e.target.value }))}
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </label>
        <label>
          Region
          <input
            value={filters.region}
            onChange={(e) => setFilters((prev) => ({ ...prev, region: e.target.value }))}
            placeholder="Region"
          />
        </label>
        <label>
          State
          <input
            value={filters.state}
            onChange={(e) => setFilters((prev) => ({ ...prev, state: e.target.value }))}
            placeholder="State"
          />
        </label>
        <label>
          Country
          <input
            value={filters.country}
            onChange={(e) => setFilters((prev) => ({ ...prev, country: e.target.value }))}
            placeholder="Country"
          />
        </label>
      </div>

      {distributorMissing && <p className={styles.message}>Enter a distributor ID to load dashboard data.</p>}

      <section className={styles.kpiGrid}>
        {metricsQuery.isLoading && <p className={styles.message}>Loading metrics…</p>}
        {metricsQuery.error instanceof Error && <p className={styles.error}>{metricsQuery.error.message}</p>}
        {kpiCards.map((kpi) => (
          <KpiCard key={kpi.title} title={kpi.title} value={kpi.value} delta={kpi.delta} trend={kpi.trend as any} />
        ))}
      </section>

      <section className={styles.split}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>Live Orders</p>
              <h3>Pipeline across distributors</h3>
            </div>
          </div>
          {ordersQuery.isLoading && <p className={styles.message}>Loading orders…</p>}
          {ordersQuery.error instanceof Error && <p className={styles.error}>{ordersQuery.error.message}</p>}
          <div className={styles.pipeline}>
            {pipelineStatuses.map((status) => (
              <button
                key={status}
                className={styles.pipelineItem}
                type="button"
                onClick={() =>
                  navigate(
                    `/orders?status=${encodeURIComponent(status)}${
                      distributorId ? `&distributorId=${distributorId}` : ''
                    }`
                  )
                }
              >
                <span className={styles.pipelineLabel}>{status.replace(/_/g, ' ')}</span>
                <strong>{pipeline[status] ?? 0}</strong>
              </button>
            ))}
          </div>
          <div className={styles.tableWrap}>
            <div className={styles.table}>
              <div className={styles.tableHead}>
                <span>Order ID</span>
                <span>Distributor</span>
                <span>Amount</span>
                <span>Status</span>
              </div>
              {ordersQuery.data?.slice(0, 6).map((order: any) => (
                <div key={order.id} className={styles.tableRow}>
                  <span>{order.id}</span>
                  <span>{order.distributorId ?? '—'}</span>
                  <span>${Number(order.totalAmount ?? 0).toLocaleString()}</span>
                  <StatusBadge
                    label={order.status}
                    tone={
                      order.status === 'delivered'
                        ? 'success'
                        : order.status === 'dispatched'
                          ? 'info'
                          : order.status === 'approved'
                            ? 'warning'
                            : 'danger'
                    }
                  />
                </div>
              ))}
              {!ordersQuery.data?.length && !ordersQuery.isLoading && (
                <p className={styles.message}>No orders</p>
              )}
            </div>
          </div>
        </div>

        <div className={styles.sideStack}>
          <div className={styles.card}>
            <p className={styles.kicker}>Stock Watch</p>
            {inventoryQuery.isLoading && <p className={styles.message}>Loading inventory…</p>}
            {inventoryQuery.error instanceof Error && (
              <p className={styles.error}>{inventoryQuery.error.message}</p>
            )}
            {inventoryQuery.data?.slice(0, 4).map((item: any) => (
              <button
                key={`${item.warehouseId}-${item.productId}`}
                className={styles.stockRow}
                type="button"
                onClick={() =>
                  navigate(
                    `/inventory?warehouseId=${item.warehouseId}${
                      distributorId ? `&distributorId=${distributorId}` : ''
                    }`
                  )
                }
              >
                <div>
                  <strong>{item.sku}</strong>
                  <p>{item.warehouseName}</p>
                </div>
                <div>
                  <p>{item.quantityOnHand} units</p>
                  <small>Reserved {item.quantityReserved}</small>
                </div>
              </button>
            ))}
          </div>
          <div className={styles.card}>
            <p className={styles.kicker}>Credit Pulse</p>
            {creditLedgerQuery.isLoading && <p className={styles.message}>Loading ledger…</p>}
            {creditLedgerQuery.error instanceof Error && (
              <p className={styles.error}>{creditLedgerQuery.error.message}</p>
            )}
            {creditLedgerQuery.data?.slice(0, 4).map((entry: any) => (
              <button
                key={entry.id}
                className={styles.creditRow}
                type="button"
                onClick={() =>
                  navigate(
                    `/credit${distributorId ? `?distributorId=${distributorId}` : ''}`
                  )
                }
              >
                <div>
                  <strong>{entry.referenceId ?? 'Invoice'}</strong>
                  <p>Outstanding ${entry.balanceAfter}</p>
                </div>
                <div>
                  <StatusBadge
                    label={entry.dueDate ? `Due ${entry.dueDate}` : 'No due date'}
                    tone={entry.dueDate && new Date(entry.dueDate) < new Date() ? 'danger' : 'warning'}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {uiRole !== 'field' && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>Active Schemes</p>
              <h3>Promotion health</h3>
            </div>
            <button className="btn secondary">Configure</button>
          </div>
          {schemesQuery.isLoading && <p className={styles.message}>Loading schemes…</p>}
          {schemesQuery.error instanceof Error && (
            <p className={styles.error}>{schemesQuery.error.message}</p>
          )}
          <div className={styles.schemeGrid}>
            {schemesQuery.data?.map((scheme: any) => (
              <div key={scheme.id} className={styles.schemeCard}>
                <div className={styles.schemeHeader}>
                  <strong>{scheme.name}</strong>
                  <span>{scheme.type}</span>
                </div>
                <div className={styles.progressBar}>
                  <div style={{ width: `${scheme.progress ?? 50}%` }} />
                </div>
                <p className={styles.schemeMeta}>
                  {scheme.startDate} → {scheme.endDate}
                </p>
                <p className={styles.schemeMeta}>Budget: {scheme.budget ?? '—'}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <NotificationsPanel />
        <NotificationPreferences />
      </section>
    </div>
  );
};
