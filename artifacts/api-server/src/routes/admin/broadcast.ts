import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { bot } from "../../bot";

const router = Router();

router.post("/admin/broadcast", async (req, res) => {
  const { message, parseMode } = req.body as { message?: string; parseMode?: "Markdown" | "HTML" };

  if (!message || !message.trim()) {
    res.status(400).json({ error: "Поле message обязательно" });
    return;
  }

  const users = await db.select({ telegramId: usersTable.telegramId }).from(usersTable);

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      await bot.telegram.sendMessage(user.telegramId, message, {
        parse_mode: parseMode ?? "Markdown",
      });
      sent++;
    } catch {
      failed++;
    }
    // Задержка 50ms чтобы не попасть под rate-limit Telegram (30 msg/sec)
    await new Promise((r) => setTimeout(r, 50));
  }

  res.json({ sent, failed, total: users.length });
});

export default router;
