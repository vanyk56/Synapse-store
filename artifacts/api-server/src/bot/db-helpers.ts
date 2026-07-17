import { db } from "@workspace/db";
import { usersTable, ordersTable, aiModelsTable, productsTable, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function upsertUser(telegramId: string, firstName: string, username?: string | null, lastName?: string | null) {
  const existing = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId)).limit(1);
  if (existing.length > 0) {
    const [updated] = await db
      .update(usersTable)
      .set({ firstName, username: username ?? null, lastName: lastName ?? null })
      .where(eq(usersTable.telegramId, telegramId))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(usersTable)
    .values({ telegramId, firstName, username: username ?? null, lastName: lastName ?? null })
    .returning();
  return created;
}

export async function getUserByTelegramId(telegramId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId)).limit(1);
  return user ?? null;
}

export async function createOrder(
  userId: number,
  type: string,
  amountStar: number,
  meta: Record<string, unknown>
) {
  const [order] = await db
    .insert(ordersTable)
    .values({ userId, type, status: "pending", amountStar, meta })
    .returning();
  return order;
}

export async function completeOrder(orderId: number, chargeId: string, extraMeta: Record<string, unknown> = {}) {
  const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!existing) return null;
  const merged = { ...(existing.meta as Record<string, unknown>), ...extraMeta };
  const [order] = await db
    .update(ordersTable)
    .set({ status: "completed", telegramPaymentChargeId: chargeId, meta: merged, updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId))
    .returning();
  // Update user stats
  await db
    .update(usersTable)
    .set({
      totalOrders: db.$count(ordersTable, eq(ordersTable.userId, existing.userId)),
      totalSpentStar: existing.userId as unknown as number, // placeholder — will be recalculated below
    })
    .where(eq(usersTable.id, existing.userId));

  const allOrders = await db.select().from(ordersTable).where(eq(ordersTable.userId, existing.userId));
  const completedOrders = allOrders.filter((o) => o.status === "completed");
  const totalSpent = completedOrders.reduce((sum, o) => sum + o.amountStar, 0);
  await db
    .update(usersTable)
    .set({
      totalOrders: completedOrders.length,
      totalSpentStar: totalSpent,
    })
    .where(eq(usersTable.id, existing.userId));

  return order;
}

export async function getActiveAiModels() {
  return db.select().from(aiModelsTable).where(eq(aiModelsTable.active, true));
}

export async function getActiveProducts() {
  return db.select().from(productsTable).where(eq(productsTable.active, true));
}

export async function getSettingValue<T>(key: string, fallback: T): Promise<T> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  return row ? (row.value as T) : fallback;
}
