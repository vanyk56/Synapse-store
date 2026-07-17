import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const DEFAULT_SETTINGS = {
  defaultMarkupPercent: 20,
  defaultStarRatePerUsd: 71,
  openrouterMarkupPercent: 10,
  botWelcomeMessage: "Добро пожаловать! Выберите, что вас интересует:",
  botSupportUsername: null as string | null,
};

async function getSettingValue(key: string, fallback: unknown) {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  return row ? row.value : fallback;
}

router.get("/admin/settings", async (_req, res) => {
  const rows = await db.select().from(settingsTable);
  const map: Record<string, unknown> = {};
  for (const r of rows) map[r.key] = r.value;

  res.json({
    defaultMarkupPercent: (map.defaultMarkupPercent as number) ?? DEFAULT_SETTINGS.defaultMarkupPercent,
    defaultStarRatePerUsd: (map.defaultStarRatePerUsd as number) ?? DEFAULT_SETTINGS.defaultStarRatePerUsd,
    openrouterMarkupPercent: (map.openrouterMarkupPercent as number) ?? DEFAULT_SETTINGS.openrouterMarkupPercent,
    botWelcomeMessage: (map.botWelcomeMessage as string) ?? DEFAULT_SETTINGS.botWelcomeMessage,
    botSupportUsername: (map.botSupportUsername as string | null) ?? DEFAULT_SETTINGS.botSupportUsername,
  });
});

router.patch("/admin/settings", async (req, res) => {
  const { defaultMarkupPercent, defaultStarRatePerUsd, openrouterMarkupPercent, botWelcomeMessage, botSupportUsername } = req.body;

  const updates: { key: string; value: unknown }[] = [];
  if (defaultMarkupPercent !== undefined) updates.push({ key: "defaultMarkupPercent", value: defaultMarkupPercent });
  if (defaultStarRatePerUsd !== undefined) updates.push({ key: "defaultStarRatePerUsd", value: defaultStarRatePerUsd });
  if (openrouterMarkupPercent !== undefined) updates.push({ key: "openrouterMarkupPercent", value: openrouterMarkupPercent });
  if (botWelcomeMessage !== undefined) updates.push({ key: "botWelcomeMessage", value: botWelcomeMessage });
  if (botSupportUsername !== undefined) updates.push({ key: "botSupportUsername", value: botSupportUsername });

  for (const u of updates) {
    await db
      .insert(settingsTable)
      .values({ key: u.key, value: u.value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: u.value, updatedAt: new Date() } });
  }

  // Return updated settings
  const rows = await db.select().from(settingsTable);
  const map: Record<string, unknown> = {};
  for (const r of rows) map[r.key] = r.value;

  res.json({
    defaultMarkupPercent: (map.defaultMarkupPercent as number) ?? DEFAULT_SETTINGS.defaultMarkupPercent,
    defaultStarRatePerUsd: (map.defaultStarRatePerUsd as number) ?? DEFAULT_SETTINGS.defaultStarRatePerUsd,
    openrouterMarkupPercent: (map.openrouterMarkupPercent as number) ?? DEFAULT_SETTINGS.openrouterMarkupPercent,
    botWelcomeMessage: (map.botWelcomeMessage as string) ?? DEFAULT_SETTINGS.botWelcomeMessage,
    botSupportUsername: (map.botSupportUsername as string | null) ?? DEFAULT_SETTINGS.botSupportUsername,
  });
});

export default router;
