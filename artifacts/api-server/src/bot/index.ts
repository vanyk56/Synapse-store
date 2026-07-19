import { Telegraf, Markup, Context } from "telegraf";
import { message } from "telegraf/filters";
import {
  upsertUser,
  getUserByTelegramId,
  createOrder,
  completeOrder,
  getActiveAiModels,
  getActiveProducts,
  getSettingValue,
} from "./db-helpers";
import { calcTokenCostInStars, usdToStars, createProvisionedKey } from "./openrouter";
import { logger } from "../lib/logger";
import * as path from "path";
import { purchaseProduct } from "./ggsel";

function escapeHtml(str: string): string {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is required");
}

export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// ─── In-memory session state ────────────────────────────────────────────────
// Stores per-user conversation state between messages
interface UserState {
  step: string;
  data: Record<string, unknown>;
}
const userStates = new Map<number, UserState>();

function setState(userId: number, step: string, data: Record<string, unknown> = {}) {
  userStates.set(userId, { step, data });
}

function getState(userId: number): UserState | undefined {
  return userStates.get(userId);
}

function clearState(userId: number) {
  userStates.delete(userId);
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function tgId(ctx: Context): string {
  return String(ctx.from?.id ?? "0");
}

function userId(ctx: Context): number {
  return ctx.from?.id ?? 0;
}

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic / Claude",
  openai: "OpenAI / ChatGPT",
  google: "Google Gemini",
  openrouter: "OpenRouter",
};

// ─── Main Menu ──────────────────────────────────────────────────────────────
async function showMainMenu(ctx: Context) {
  const welcome = await getSettingValue(
    "botWelcomeMessage",
    "Выберите, что вас интересует:"
  );
  clearState(userId(ctx));
  await ctx.reply(
    String(welcome),
    Markup.inlineKeyboard([
      [Markup.button.callback("💳 Пополнить OpenRouter", "menu:openrouter")],
      [Markup.button.callback("🔑 API-ключ нейросети", "menu:apikey")],
      [Markup.button.callback("📦 Подписки", "menu:subscriptions")],
    ])
  );
}

// ─── /start ─────────────────────────────────────────────────────────────────
bot.start(async (ctx) => {
  try {
    await upsertUser(
      tgId(ctx),
      ctx.from.first_name,
      ctx.from.username,
      ctx.from.last_name
    );
    const name = ctx.from.first_name;
    clearState(userId(ctx));
    await ctx.reply(
      `👋 Добро пожаловать, ${name}\\!\n\n` +
        `Рады видеть тебя в *Synapse Store* 🧠\n\n` +
        `У нас лучшие цены на нейросети и API\\-ключи — всё что нужно, чтобы работать с AI по\\-человечески 🚀\n\n` +
        `Выберите, что вас интересует:`,
      {
        parse_mode: "MarkdownV2",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("💳 Пополнить OpenRouter", "menu:openrouter")],
          [Markup.button.callback("🔑 API-ключ нейросети", "menu:apikey")],
          [Markup.button.callback("📦 Подписки", "menu:subscriptions")],
        ]),
      }
    );
  } catch (err) {
    logger.error({ err }, "Error handling /start");
  }
});

bot.command("menu", async (ctx) => {
  await showMainMenu(ctx);
});

// ─── OpenRouter top-up flow ─────────────────────────────────────────────────
bot.action("menu:openrouter", async (ctx) => {
  await ctx.answerCbQuery();
  setState(userId(ctx), "openrouter:amount");
  await ctx.reply(
    "💳 *Пополнение OpenRouter*\n\nВведите сумму пополнения в USD (например: `10` или `25.50`)",
    { parse_mode: "Markdown" }
  );
});

// ─── API Key flow ───────────────────────────────────────────────────────────
bot.action("menu:apikey", async (ctx) => {
  await ctx.answerCbQuery();
  const models = await getActiveAiModels();
  if (models.length === 0) {
    await ctx.reply("Сейчас нет доступных моделей. Попробуйте позже.");
    return;
  }

  // Group by provider
  const providers = [...new Set(models.map((m) => m.provider))];
  const buttons = providers.map((p) =>
    Markup.button.callback(PROVIDER_LABELS[p] ?? p, `apikey:provider:${p}`)
  );

  setState(userId(ctx), "apikey:provider");
  await ctx.reply(
    "🔑 *Получение API-ключа*\n\nВыберите провайдера:",
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard(buttons.map((b) => [b])),
    }
  );
});

// Provider selected → show models
bot.action(/^apikey:provider:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const provider = ctx.match[1];
  const models = await getActiveAiModels();
  const filtered = models.filter((m) => m.provider === provider);
  if (filtered.length === 0) {
    await ctx.reply("Нет доступных моделей для этого провайдера.");
    return;
  }

  const buttons = filtered.map((m) =>
    Markup.button.callback(
      `${m.modelName} — $${m.pricePerMillionTokens.toFixed(2)}/1M токенов`,
      `apikey:model:${m.id}`
    )
  );

  setState(userId(ctx), "apikey:model", { provider });
  await ctx.reply(
    `Выберите модель *${PROVIDER_LABELS[provider] ?? provider}*:`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard(buttons.map((b) => [b])),
    }
  );
});

// Model selected → ask for token count
bot.action(/^apikey:model:(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const modelId = Number(ctx.match[1]);
  const models = await getActiveAiModels();
  const model = models.find((m) => m.id === modelId);
  if (!model) {
    await ctx.reply("Модель не найдена. Попробуйте ещё раз.");
    return;
  }

  setState(userId(ctx), "apikey:tokens", { model });
  const rate = `${model.starRatePerUsd.toFixed(0)} ⭐/USD`;
  await ctx.reply(
    `*${model.modelName}*\n\nЦена: ${(model.pricePerMillionTokens * (1 + model.markupPercent / 100)).toFixed(2)} за 1M токенов\nКурс: ${rate}\n\nСколько миллионов токенов вам нужно?\n_Введите число, например: \`5\` = 5 миллионов токенов_`,
    { parse_mode: "Markdown" }
  );
});

// ─── Subscriptions flow ──────────────────────────────────────────────────────
bot.action("menu:subscriptions", async (ctx) => {
  await ctx.answerCbQuery();
  const products = await getActiveProducts();
  if (products.length === 0) {
    await ctx.reply("Сейчас нет доступных подписок. Попробуйте позже.");
    return;
  }

  const buttons = products.map((p) =>
    Markup.button.callback(`${p.name} — ⭐ ${p.price1m}/мес`, `sub:product:${p.id}`)
  );

  setState(userId(ctx), "sub:product");
  await ctx.reply(
    "📦 *Подписки*\n\nВыберите подписку:",
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard(buttons.map((b) => [b])),
    }
  );
});

// Product selected → show durations
bot.action(/^sub:product:(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const productId = Number(ctx.match[1]);
  const products = await getActiveProducts();
  const product = products.find((p) => p.id === productId);
  if (!product) {
    await ctx.reply("Подписка не найдена.");
    return;
  }

  const durationButtons = [];
  durationButtons.push(Markup.button.callback(`1 месяц — ⭐ ${product.price1m}`, `sub:duration:${productId}:1`));
  if (product.price3m) durationButtons.push(Markup.button.callback(`3 месяца — ⭐ ${product.price3m}`, `sub:duration:${productId}:3`));
  if (product.price6m) durationButtons.push(Markup.button.callback(`6 месяцев — ⭐ ${product.price6m}`, `sub:duration:${productId}:6`));
  if (product.price12m) durationButtons.push(Markup.button.callback(`1 год — ⭐ ${product.price12m}`, `sub:duration:${productId}:12`));

  const desc = product.description ? `\n${product.description}\n\n` : "\n\n";
  setState(userId(ctx), "sub:duration", { product });
  await ctx.reply(
    `*${product.name}*${desc}Выберите срок подписки:`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard(durationButtons.map((b) => [b])),
    }
  );
});

// Duration selected → create Stars invoice
bot.action(/^sub:duration:(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const productId = Number(ctx.match[1]);
  const months = Number(ctx.match[2]);
  const products = await getActiveProducts();
  const product = products.find((p) => p.id === productId);
  if (!product) {
    await ctx.reply("Подписка не найдена.");
    return;
  }

  const priceMap: Record<number, number | null> = {
    1: product.price1m,
    3: product.price3m,
    6: product.price6m,
    12: product.price12m,
  };
  const stars = priceMap[months] ?? product.price1m;
  const monthLabel = months === 1 ? "1 месяц" : months === 3 ? "3 месяца" : months === 6 ? "6 месяцев" : "1 год";

  const user = await getUserByTelegramId(tgId(ctx));
  if (!user) {
    await ctx.reply("Ошибка: пользователь не найден. Напишите /start");
    return;
  }

  const order = await createOrder(user.id, "subscription", stars, {
    productId,
    productName: product.name,
    service: product.service,
    months,
  });

  clearState(userId(ctx));
  await ctx.replyWithInvoice({
    title: `${product.name} — ${monthLabel}`,
    description: product.description ?? `Подписка ${product.service} на ${monthLabel}`,
    payload: `sub:${order.id}`,
    provider_token: "",
    currency: "XTR",
    prices: [{ label: `${product.name} (${monthLabel})`, amount: stars }],
  });
});

// ─── Message handler (text input during flows) ───────────────────────────────
bot.on(message("text"), async (ctx) => {
  const state = getState(userId(ctx));
  if (!state) {
    await showMainMenu(ctx);
    return;
  }
  const text = ctx.message.text.trim();

  // ── OpenRouter amount step ──
  if (state.step === "openrouter:amount") {
    const amount = parseFloat(text);
    if (isNaN(amount) || amount < 1) {
      await ctx.reply("Введите корректную сумму в USD (минимум $1):");
      return;
    }

    const markupPercent = await getSettingValue<number>("openrouterMarkupPercent", 10);
    const starRate = await getSettingValue<number>("defaultStarRatePerUsd", 50);
    const totalUsd = amount * (1 + markupPercent / 100);
    const stars = usdToStars(totalUsd, starRate);

    setState(userId(ctx), "openrouter:link", { amountUsd: amount, stars });

    await ctx.reply(
      `💳 *Пополнение OpenRouter*\n\n` +
        `Сумма: ${amount.toFixed(2)} USD\n` +
        `К оплате: ⭐ ${stars}\n\n` +
        `📌 *Инструкция:*\n` +
        `1. Перейдите в настройки [openrouter.ai/credits](https://openrouter.ai/credits)\n` +
        `2. Нажмите *Add Credits*, выберите оплату картой (Stripe) и введите нужную сумму\n` +
        `3. На странице оплаты Stripe скопируйте ссылку из адресной строки браузера (она начинается с \`https://checkout.stripe.com/...\`)\n` +
        `4. Отправьте скопированную ссылку в ответ на это сообщение\n\n` +
        `_После отправки ссылки вы получите счёт на оплату в Telegram Stars_`,
      { parse_mode: "Markdown", link_preview_options: { is_disabled: true } }
    );
    return;
  }

  // ── OpenRouter link step ──
  if (state.step === "openrouter:link") {
    const { amountUsd, stars } = state.data as { amountUsd: number; stars: number };

    setState(userId(ctx), "openrouter:waiting", {
      amountUsd,
      stars,
      link: text,
    });

    const user = await getUserByTelegramId(tgId(ctx));
    if (!user) {
      await ctx.reply("Ошибка: пользователь не найден. Напишите /start");
      return;
    }
    const order = await createOrder(user.id, "openrouter", stars, {
      amountUsd,
      link: text,
    });

    clearState(userId(ctx));
    await ctx.replyWithInvoice({
      title: `Пополнение OpenRouter ${(amountUsd as number).toFixed(2)}`,
      description: `Пополнение баланса OpenRouter на ${(amountUsd as number).toFixed(2)}`,
      payload: `openrouter:${order.id}`,
      provider_token: "",
      currency: "XTR",
      prices: [{ label: `OpenRouter ${(amountUsd as number).toFixed(2)}`, amount: stars as number }],
    });
    return;
  }

  // ── API Key tokens step ──
  if (state.step === "apikey:tokens") {
    const millions = parseFloat(text);
    if (isNaN(millions) || millions <= 0) {
      await ctx.reply("Введите корректное число миллионов токенов (например: 5):");
      return;
    }

    const { model } = state.data as { model: { id: number; modelName: string; pricePerMillionTokens: number; markupPercent: number; starRatePerUsd: number; modelId: string; provider: string; deliveryData?: string | null } };
    const stars = calcTokenCostInStars(
      model.pricePerMillionTokens,
      model.markupPercent,
      model.starRatePerUsd,
      millions
    );
    const totalUsd = model.pricePerMillionTokens * (1 + model.markupPercent / 100) * millions;

    const user = await getUserByTelegramId(tgId(ctx));
    if (!user) {
      await ctx.reply("Ошибка: пользователь не найден. Напишите /start");
      return;
    }
    const order = await createOrder(user.id, "api_key", stars, {
      modelId: model.id,
      modelExternalId: model.modelId,
      provider: model.provider,
      modelName: model.modelName,
      millionsOfTokens: millions,
      amountUsd: totalUsd,
      deliveryData: model.deliveryData ?? null,
    });

    clearState(userId(ctx));
    await ctx.reply(
      `🔑 *${model.modelName}*\n\n` +
        `Токенов: ${millions}M\n` +
        `Стоимость: $${totalUsd.toFixed(2)} = ⭐ ${stars}\n\n` +
        `Нажмите кнопку ниже для оплаты:`,
      { parse_mode: "Markdown" }
    );
    await ctx.replyWithInvoice({
      title: `API-ключ ${model.modelName} — ${millions}M токенов`,
      description: `Provisioned API key: ${model.modelName}, лимит ${millions}M токенов`,
      payload: `apikey:${order.id}`,
      provider_token: "",
      currency: "XTR",
      prices: [{ label: `${model.modelName} (${millions}M tokens)`, amount: stars }],
    });
    return;
  }

  // Default
  await showMainMenu(ctx);
});

// ─── Pre-checkout query (must always be approved) ───────────────────────────
bot.on("pre_checkout_query", async (ctx) => {
  await ctx.answerPreCheckoutQuery(true);
});

// ─── Successful payment ──────────────────────────────────────────────────────
bot.on(message("successful_payment"), async (ctx) => {
  const payment = ctx.message.successful_payment;
  const payload = payment.invoice_payload;
  const chargeId = payment.telegram_payment_charge_id;

  try {
    if (payload.startsWith("openrouter:")) {
      const orderId = Number(payload.split(":")[1]);
      const order = await completeOrder(orderId, chargeId);
      if (!order) {
        await ctx.reply("Ошибка обработки заказа. Обратитесь в поддержку.");
        return;
      }
      const meta = order.meta as { amountUsd: number; link: string };
      await ctx.reply(
        `✅ *Оплата получена!*\n\n` +
          `Сумма: ⭐ ${payment.total_amount}\n` +
          `Заказ: #${orderId}\n\n` +
          `🕐 Обработка платежа. Пожалуйста, ожидайте до 10 минут.\n\n` +
          `По вопросам: /menu`,
        { parse_mode: "Markdown" }
      );

      // Launch GGSel top-up automation in the background
      const adminId = process.env.ADMIN_TELEGRAM_ID;
      const amountUsd = meta.amountUsd;
      const stripeLink = meta.link;

      if (adminId) {
        (async () => {
          let adminStatusMsg: any = null;
          try {
            adminStatusMsg = await bot.telegram.sendMessage(
              adminId,
              `🔔 <b>Новый заказ #${orderId} на пополнение OpenRouter</b>\n` +
                `Сумма: ${amountUsd.toFixed(2)} USD\n` +
                `Пользователь: ${escapeHtml(ctx.from.first_name)} (@${escapeHtml(ctx.from.username || "no_username")})\n` +
                `Ссылка: ${escapeHtml(stripeLink)}\n\n` +
                `🤖 Запуск автоматического оформления заказа...`,
              { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
            );

            let currentReplyMarkup: any = undefined;

            const updateStatus = async (statusText: string) => {
              try {
                if (adminStatusMsg) {
                  await bot.telegram.editMessageText(
                    adminId,
                    adminStatusMsg.message_id,
                    undefined,
                    `🔔 <b>Заказ #${orderId} — Статус:</b>\n\n${escapeHtml(statusText)}`,
                    { parse_mode: "HTML", reply_markup: currentReplyMarkup }
                  );
                }
              } catch (err) {}
            };

            const sendScreenshot = async (filePath: string, caption: string) => {
              // Screenshots disabled to avoid cluttering chat
            };

            const handlePaymentLink = async (sbpLink: string, qrScreenshotPath: string) => {
              try {
                const { db } = await import("@workspace/db");
                const { ordersTable } = await import("@workspace/db");
                const { eq } = await import("drizzle-orm");

                const currentOrder = await db
                  .select()
                  .from(ordersTable)
                  .where(eq(ordersTable.id, orderId))
                  .limit(1);
                if (currentOrder.length > 0) {
                  const existingMeta = (currentOrder[0].meta || {}) as Record<string, any>;
                  await db
                    .update(ordersTable)
                    .set({
                      meta: { ...existingMeta, sbpLink },
                    })
                    .where(eq(ordersTable.id, orderId));
                }
              } catch (dbErr) {
                logger.error({ dbErr, orderId }, "Failed to save sbpLink to order meta");
              }

              if (adminId && adminStatusMsg) {
                if (sbpLink) {
                  // Direct SBP link found! Attach as button to the existing status message
                  currentReplyMarkup = {
                    inline_keyboard: [[{ text: "🔗 Оплатить СБП", url: sbpLink }]],
                  };
                  await updateStatus("🎉 Ссылка на оплату СБП готова! Оплатите по кнопке ниже.");
                } else {
                  // Fallback: send the QR code photo separately
                  await updateStatus("⚠️ Прямая ссылка СБП не найдена. Пожалуйста, отсканируйте QR-код ниже:");
                  try {
                    await bot.telegram.sendPhoto(
                      adminId,
                      { source: qrScreenshotPath },
                      { caption: `📸 QR-код для оплаты заказа #${orderId}` }
                    );
                  } catch (e) {}
                }
              }
            };

            const result = await purchaseProduct(stripeLink, amountUsd, {
              onStatus: updateStatus,
              onScreenshot: sendScreenshot,
              onPaymentLink: handlePaymentLink,
              tempDir: path.join("./temp", `order-${orderId}`),
            });

            if (result.success) {
              currentReplyMarkup = undefined; // Clear inline button upon completion

              if (result.isPaid) {
                // Notify user
                await bot.telegram.sendMessage(
                  ctx.chat.id,
                  `🎉 *Баланс OpenRouter успешно пополнен!*\n\n` +
                    `Сумма: ${amountUsd.toFixed(2)} USD зачислена на ваш аккаунт.\n` +
                    `Заказ #${orderId} выполнен. Спасибо за покупку!`,
                  { parse_mode: "Markdown" }
                );

                // Notify admin
                await bot.telegram.sendMessage(
                  adminId,
                  `✅ <b>Заказ #${orderId} успешно оплачен и выполнен автоматически!</b>`,
                  { parse_mode: "HTML" }
                );
              } else {
                await bot.telegram.sendMessage(
                  adminId,
                  `⚠️ <b>Заказ #${orderId}: Скрипт завершил работу, но оплата не подтвердилась автоматически.</b> Пожалуйста, проверьте статус заказа вручную.`,
                  { parse_mode: "HTML" }
                );
              }
            }
          } catch (err: any) {
            logger.error({ err, orderId }, "GGSel automation failed");
            if (adminId) {
              await bot.telegram.sendMessage(
                adminId,
                `❌ <b>Ошибка авто-пополнения для заказа #${orderId}:</b>\n${escapeHtml(err.message)}`,
                { parse_mode: "HTML" }
              );
            }
            await bot.telegram.sendMessage(
              ctx.chat.id,
              `⚠️ Произошла ошибка при автоматическом проведении платежа. Пожалуйста, обратитесь в поддержку для ручного пополнения. Ваш платёж зафиксирован. Заказ #${orderId}.`
            );
          }
        })();
      } else {
        logger.warn({ orderId }, "ADMIN_TELEGRAM_ID is not set, skipping GGSel automation");
        await ctx.reply(
          `⚠️ Администратор не настроен в системе (нет ADMIN_TELEGRAM_ID).\n` +
            `Пожалуйста, обратитесь в поддержку с номером вашего заказа: #${orderId}`
        );
      }
    } else if (payload.startsWith("apikey:")) {
      const orderId = Number(payload.split(":")[1]);

      // Get order details to provision the key
      const { db } = await import("@workspace/db");
      const { ordersTable } = await import("@workspace/db");
      const { eq } = await import("drizzle-orm");
      const [orderRaw] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
      if (!orderRaw) {
        await ctx.reply("Ошибка: заказ не найден. Обратитесь в поддержку.");
        return;
      }

      const meta = orderRaw.meta as { modelName: string; millionsOfTokens: number; amountUsd: number; modelExternalId: string; provider: string; deliveryData?: string | null };
      const limitUsd = meta.amountUsd;
      const keyName = `bot-user-${ctx.from.id}-order-${orderId}`;

      let apiKey = "";
      let keyError = "";
      try {
        const provisioned = await createProvisionedKey(keyName, limitUsd);
        apiKey = provisioned.key;
      } catch (err) {
        keyError = "Ошибка создания ключа — обратитесь в поддержку.";
        logger.error({ err }, "Failed to provision OpenRouter key");
      }

      await completeOrder(orderId, chargeId, { apiKey, provisioned: !keyError });

      if (apiKey) {
        await ctx.reply(
          `✅ *Оплата получена! Вот ваш API-ключ:*\n\n` +
            `Модель: ${meta.modelName}\n` +
            `Лимит: ${meta.millionsOfTokens}M токенов\n\n` +
            `\`${apiKey}\`\n\n` +
            `⚠️ Сохраните ключ — он показывается только один раз.\n` +
            `Ключ работает через OpenRouter API (openrouter.ai).\n` +
            `Формат: \`Authorization: Bearer ${apiKey}\``,
          { parse_mode: "Markdown" }
        );
      } else {
        await ctx.reply(
          `✅ Оплата получена!\n\n${keyError}\nЗаказ #${orderId}\n\nОбратитесь в поддержку.`
        );
      }

      // Send delivery data if configured for this model
      if (meta.deliveryData) {
        await ctx.reply(
          `📦 *Данные для доступа:*\n\n${meta.deliveryData}`,
          { parse_mode: "Markdown" }
        );
      }
    } else if (payload.startsWith("sub:")) {
      const orderId = Number(payload.split(":")[1]);
      const order = await completeOrder(orderId, chargeId);
      if (!order) {
        await ctx.reply("Ошибка обработки заказа. Обратитесь в поддержку.");
        return;
      }
      const meta = order.meta as { productName: string; service: string; months: number };
      const months = meta.months;
      const monthLabel = months === 1 ? "1 месяц" : months === 3 ? "3 месяца" : months === 6 ? "6 месяцев" : "1 год";
      await ctx.reply(
        `✅ *Подписка оформлена!*\n\n` +
          `${meta.productName}\n` +
          `Срок: ${monthLabel}\n` +
          `Оплачено: ⭐ ${payment.total_amount}\n` +
          `Заказ: #${orderId}\n\n` +
          `С вами свяжутся для предоставления доступа.\n` +
          `По вопросам: /menu`,
        { parse_mode: "Markdown" }
      );
    }
  } catch (err) {
    logger.error({ err, payload }, "Error processing successful payment");
    await ctx.reply("Произошла ошибка при обработке платежа. Обратитесь в поддержку. Заказ сохранён.");
  }
});

// ─── Back / cancel ───────────────────────────────────────────────────────────
bot.action("back:main", async (ctx) => {
  await ctx.answerCbQuery();
  await showMainMenu(ctx);
});

export function startBot() {
  const launch = () => {
    bot.launch({ dropPendingUpdates: true }).catch((err: unknown) => {
      const code = (err as { response?: { error_code?: number } })?.response?.error_code;
      if (code === 409) {
        logger.warn("Bot polling conflict (409) — retrying in 10s");
        setTimeout(launch, 10_000);
      } else {
        logger.error({ err }, "Bot crashed unexpectedly");
        // Don't exit the process — API server keeps running
      }
    });
  };

  launch();
  logger.info("Telegram bot started (polling)");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
