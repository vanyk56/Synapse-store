import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, usersTable } from "@workspace/db";
import { eq, and, sql, count } from "drizzle-orm";

const router = Router();

router.get("/admin/orders", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const type = req.query.type as string | undefined;
  const status = req.query.status as string | undefined;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (type) conditions.push(eq(ordersTable.type, type));
  if (status) conditions.push(eq(ordersTable.status, status));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(whereClause);

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
    .where(whereClause)
    .orderBy(sql`${ordersTable.createdAt} desc`)
    .limit(limit)
    .offset(offset);

  res.json({
    orders: orders.map((o) => ({ ...o, userFirstName: o.userFirstName ?? "Unknown" })),
    total: totalRow.count,
    page,
    limit,
  });
});

router.get("/admin/orders/:id", async (req, res) => {
  const [row] = await db
    .select({
      id: ordersTable.id,
      type: ordersTable.type,
      status: ordersTable.status,
      amountStar: ordersTable.amountStar,
      userId: ordersTable.userId,
      userFirstName: usersTable.firstName,
      userTelegramId: usersTable.telegramId,
      meta: ordersTable.meta,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .where(eq(ordersTable.id, Number(req.params.id)));

  if (!row) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json({ ...row, userFirstName: row.userFirstName ?? "Unknown", userTelegramId: row.userTelegramId ?? "" });
});

router.patch("/admin/orders/:id/complete", async (req, res) => {
  const [order] = await db
    .update(ordersTable)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(ordersTable.id, Number(req.params.id)))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId));

  // Notify customer of completion
  if (user?.telegramId) {
    try {
      const { bot } = await import("../../bot");
      const meta = order.meta as Record<string, any> | null;
      const amountUsd = meta?.amountUsd;
      const amountStr = amountUsd ? `${amountUsd.toFixed(2)} USD` : `${order.amountStar} ⭐`;

      await bot.telegram.sendMessage(
        user.telegramId,
        `🎉 *Баланс OpenRouter успешно пополнен!*\n\n` +
          `Сумма: ${amountStr} зачислена на ваш аккаунт.\n` +
          `Заказ #${order.id} выполнен. Спасибо за покупку!`,
        { parse_mode: "Markdown" }
      );
    } catch (err) {
      console.error("Failed to send manual completion notification:", err);
    }
  }

  res.json({
    ...order,
    userFirstName: user?.firstName ?? "Unknown",
    userTelegramId: user?.telegramId ?? "",
  });
});

router.patch("/admin/orders/:id/cancel", async (req, res) => {
  const [order] = await db
    .update(ordersTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(ordersTable.id, Number(req.params.id)))
    .returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId));
  res.json({
    ...order,
    userFirstName: user?.firstName ?? "Unknown",
    userTelegramId: user?.telegramId ?? "",
  });
});

export default router;
