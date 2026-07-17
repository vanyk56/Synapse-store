import { Router } from "express";
import { db } from "@workspace/db";
import { aiModelsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/admin/ai-models", async (_req, res) => {
  const models = await db
    .select()
    .from(aiModelsTable)
    .orderBy(sql`${aiModelsTable.provider} asc, ${aiModelsTable.modelName} asc`);
  res.json(models);
});

router.post("/admin/ai-models", async (req, res) => {
  const { provider, modelId, modelName, inputPricePerMillionTokens, pricePerMillionTokens, markupPercent, starRatePerUsd, deliveryData, active } = req.body;
  if (!provider || !modelId || !modelName || pricePerMillionTokens == null || markupPercent == null || starRatePerUsd == null) {
    res.status(400).json({ error: "All fields required" });
    return;
  }
  const [model] = await db
    .insert(aiModelsTable)
    .values({ provider, modelId, modelName, inputPricePerMillionTokens: inputPricePerMillionTokens ?? 0, pricePerMillionTokens, markupPercent, starRatePerUsd, deliveryData: deliveryData ?? null, active: active ?? true })
    .returning();
  res.status(201).json(model);
});

router.patch("/admin/ai-models/:id", async (req, res) => {
  const { modelName, inputPricePerMillionTokens, pricePerMillionTokens, markupPercent, starRatePerUsd, deliveryData, active } = req.body;
  const [model] = await db
    .update(aiModelsTable)
    .set({ modelName, ...(inputPricePerMillionTokens != null && { inputPricePerMillionTokens }), pricePerMillionTokens, markupPercent, starRatePerUsd, deliveryData: deliveryData ?? null, active })
    .where(eq(aiModelsTable.id, Number(req.params.id)))
    .returning();
  if (!model) {
    res.status(404).json({ error: "Model not found" });
    return;
  }
  res.json(model);
});

router.delete("/admin/ai-models/:id", async (req, res) => {
  await db.delete(aiModelsTable).where(eq(aiModelsTable.id, Number(req.params.id)));
  res.status(204).send();
});

router.patch("/admin/ai-models/:id/toggle", async (req, res) => {
  const [existing] = await db
    .select()
    .from(aiModelsTable)
    .where(eq(aiModelsTable.id, Number(req.params.id)));
  if (!existing) {
    res.status(404).json({ error: "Model not found" });
    return;
  }
  const [model] = await db
    .update(aiModelsTable)
    .set({ active: !existing.active })
    .where(eq(aiModelsTable.id, Number(req.params.id)))
    .returning();
  res.json(model);
});

export default router;
