import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const settingsTable = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Setting = typeof settingsTable.$inferSelect;
