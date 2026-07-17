import { pgTable, serial, text, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aiModelsTable = pgTable("ai_models", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(), // anthropic | openai | google | openrouter
  modelId: text("model_id").notNull(),
  modelName: text("model_name").notNull(),
  inputPricePerMillionTokens: real("input_price_per_million_tokens").notNull().default(0),
  pricePerMillionTokens: real("price_per_million_tokens").notNull(), // output price — used for billing
  markupPercent: real("markup_percent").notNull().default(20),
  starRatePerUsd: real("star_rate_per_usd").notNull().default(50),
  deliveryData: text("delivery_data"), // optional: account/link/credentials sent to user after payment
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAiModelSchema = createInsertSchema(aiModelsTable).omit({ id: true, createdAt: true });
export type InsertAiModel = z.infer<typeof insertAiModelSchema>;
export type AiModel = typeof aiModelsTable.$inferSelect;
