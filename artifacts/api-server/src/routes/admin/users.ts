import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, ordersTable } from "@workspace/db";
import { eq, ilike, count, or, sql } from "drizzle-orm";

const router = Router();

router.get("/admin/users", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const search = req.query.search as string | undefined;
  const offset = (page - 1) * limit;

  const whereClause = search
    ? or(
        ilike(usersTable.firstName, `%${search}%`),
        ilike(usersTable.username, `%${search}%`),
        ilike(usersTable.telegramId, `%${search}%`)
      )
    : undefined;

  const [totalRow] = await db
    .select({ count: count() })
    .from(usersTable)
    .where(whereClause);

  const users = await db
    .select()
    .from(usersTable)
    .where(whereClause)
    .orderBy(sql`${usersTable.createdAt} desc`)
    .limit(limit)
    .offset(offset);

  res.json({ users, total: totalRow.count, page, limit });
});

router.get("/admin/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const recentOrders = await db
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
    .where(eq(ordersTable.userId, id))
    .orderBy(sql`${ordersTable.createdAt} desc`)
    .limit(10);

  res.json({
    ...user,
    recentOrders: recentOrders.map((o) => ({
      ...o,
      userFirstName: o.userFirstName ?? "Unknown",
    })),
  });
});

router.get("/admin/users/:id/orders", async (req, res) => {
  const id = Number(req.params.id);
  const orders = await db
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
    .where(eq(ordersTable.userId, id))
    .orderBy(sql`${ordersTable.createdAt} desc`);

  res.json(
    orders.map((o) => ({ ...o, userFirstName: o.userFirstName ?? "Unknown" }))
  );
});

export default router;
