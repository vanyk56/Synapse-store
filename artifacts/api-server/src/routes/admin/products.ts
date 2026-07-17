import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/admin/products", async (_req, res) => {
  const products = await db
    .select()
    .from(productsTable)
    .orderBy(sql`${productsTable.createdAt} desc`);
  res.json(products);
});

router.post("/admin/products", async (req, res) => {
  const { name, description, service, price1m, price3m, price6m, price12m, active } = req.body;
  if (!name || !service || !price1m) {
    res.status(400).json({ error: "name, service and price1m are required" });
    return;
  }
  const [product] = await db
    .insert(productsTable)
    .values({ name, description, service, price1m, price3m, price6m, price12m, active: active ?? true })
    .returning();
  res.status(201).json(product);
});

router.get("/admin/products/:id", async (req, res) => {
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, Number(req.params.id)));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(product);
});

router.patch("/admin/products/:id", async (req, res) => {
  const { name, description, service, price1m, price3m, price6m, price12m, active } = req.body;
  const [product] = await db
    .update(productsTable)
    .set({ name, description, service, price1m, price3m, price6m, price12m, active })
    .where(eq(productsTable.id, Number(req.params.id)))
    .returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(product);
});

router.delete("/admin/products/:id", async (req, res) => {
  await db.delete(productsTable).where(eq(productsTable.id, Number(req.params.id)));
  res.status(204).send();
});

router.patch("/admin/products/:id/toggle", async (req, res) => {
  const [existing] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, Number(req.params.id)));
  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const [product] = await db
    .update(productsTable)
    .set({ active: !existing.active })
    .where(eq(productsTable.id, Number(req.params.id)))
    .returning();
  res.json(product);
});

export default router;
