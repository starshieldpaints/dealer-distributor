import { pool } from '../../db/pool';

export interface PerformanceSummary {
  distributorId: string;
  totalOrders: number;
  totalAmount: number;
  fillRate: number;
  returnRate: number;
}

export const getPerformanceSummary = async (
  distributorId: string,
  startDate?: string,
  endDate?: string
): Promise<PerformanceSummary> => {
  const res = await pool.query<PerformanceSummary>({
    text: `
      WITH order_stats AS (
        SELECT
          distributor_id,
          COUNT(*) FILTER (WHERE status NOT IN ('draft','cancelled')) AS total_orders,
          SUM(total_amount) AS total_amount,
          SUM(
            CASE WHEN fulfilled_lines = total_lines AND total_lines > 0 THEN 1 ELSE 0 END
          )::float / NULLIF(COUNT(*),0) AS fill_rate
        FROM order_metrics
        WHERE distributor_id = $1
          AND ($2::timestamptz IS NULL OR created_at >= $2)
          AND ($3::timestamptz IS NULL OR created_at <= $3)
        GROUP BY distributor_id
      ),
      return_stats AS (
        SELECT distributor_id,
               COUNT(*) FILTER (WHERE status = 'approved')::float / NULLIF(COUNT(*),0) AS return_rate
        FROM returns
        WHERE distributor_id = $1
          AND ($2::timestamptz IS NULL OR created_at >= $2)
          AND ($3::timestamptz IS NULL OR created_at <= $3)
        GROUP BY distributor_id
      )
      SELECT
        $1::uuid as "distributorId",
        COALESCE(order_stats.total_orders, 0) as "totalOrders",
        COALESCE(order_stats.total_amount, 0) as "totalAmount",
        COALESCE(order_stats.fill_rate, 0) as "fillRate",
        COALESCE(return_stats.return_rate, 0) as "returnRate"
      FROM order_stats
      FULL OUTER JOIN return_stats ON order_stats.distributor_id = return_stats.distributor_id
    `,
    values: [distributorId, startDate ?? null, endDate ?? null]
  });

  return (
    res.rows[0] ?? {
      distributorId,
      totalOrders: 0,
      totalAmount: 0,
      fillRate: 0,
      returnRate: 0
    }
  );
};
