import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, ordersTable } from "@workspace/db";
import { sql, count, sum, and, gte, eq } from "drizzle-orm";

const router = Router();

router.get("/admin/dashboard", async (req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers] = await db.select({ count: count() }).from(usersTable);
  const [totalOrders] = await db.select({ count: count() }).from(ordersTable);
  const [completedOrders] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(eq(ordersTable.status, "completed"));
  const [pendingOrders] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(eq(ordersTable.status, "pending"));
  const [revTotal] = await db
    .select({ total: sum(ordersTable.amountStar) })
    .from(ordersTable)
    .where(eq(ordersTable.status, "completed"));
  const [revToday] = await db
    .select({ total: sum(ordersTable.amountStar) })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.status, "completed"),
        gte(ordersTable.createdAt, todayStart)
      )
    );
  const [newUsersToday] = await db
    .select({ count: count() })
    .from(usersTable)
    .where(gte(usersTable.createdAt, todayStart));
  const [newUsersWeek] = await db
    .select({ count: count() })
    .from(usersTable)
    .where(gte(usersTable.createdAt, weekStart));

  const ordersByType = await db
    .select({ type: ordersTable.type, cnt: count() })
    .from(ordersTable)
    .groupBy(ordersTable.type);

  const byType = { openrouter: 0, api_key: 0, subscription: 0 };
  for (const row of ordersByType) {
    if (row.type === "openrouter") byType.openrouter = row.cnt;
    if (row.type === "api_key") byType.api_key = row.cnt;
    if (row.type === "subscription") byType.subscription = row.cnt;
  }

  res.json({
    totalUsers: totalUsers.count,
    totalOrders: totalOrders.count,
    completedOrders: completedOrders.count,
    pendingOrders: pendingOrders.count,
    totalRevenueStar: Number(revTotal.total ?? 0),
    revenueToday: Number(revToday.total ?? 0),
    newUsersToday: newUsersToday.count,
    newUsersThisWeek: newUsersWeek.count,
    ordersByType: byType,
  });
});

router.get("/admin/dashboard/recent-orders", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const rows = await db
    .select({
      id: ordersTable.id,
      type: ordersTable.type,
      status: ordersTable.status,
      amountStar: ordersTable.amountStar,
      userId: ordersTable.userId,
      userFirstName: usersTable.firstName,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .orderBy(sql`${ordersTable.createdAt} desc`)
    .limit(limit);

  res.json(
    rows.map((r) => ({
      ...r,
      userFirstName: r.userFirstName ?? "Unknown",
    }))
  );
});

router.get("/admin/dashboard/revenue-chart", async (req, res) => {
  const rows = await db.execute(sql`
    SELECT
      date_trunc('day', created_at)::date AS date,
      COALESCE(SUM(amount_star) FILTER (WHERE status = 'completed'), 0) AS stars,
      COUNT(*) AS orders
    FROM orders
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY 1
    ORDER BY 1
  `);

  res.json(
    (rows.rows as { date: string; stars: string; orders: string }[]).map(
      (r) => ({
        date: String(r.date),
        stars: Number(r.stars),
        orders: Number(r.orders),
      })
    )
  );
});

export default router;
