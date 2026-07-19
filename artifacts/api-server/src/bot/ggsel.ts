import { chromium } from "playwright";
import * as path from "path";
import * as fs from "fs";

export interface PurchaseOptions {
  onStatus?: (statusText: string) => Promise<void> | void;
  onScreenshot?: (filePath: string, caption: string) => Promise<void> | void;
  onPaymentLink?: (sbpLink: string | null, qrScreenshotPath: string) => Promise<void> | void;
  tempDir?: string;
  email?: string;
  ggselProductUrl?: string;
  headless?: boolean;
}

/**
 * Automates the purchase flow on GGSel for the specified OpenRouter top-up product.
 */
export async function purchaseProduct(
  paymentLink: string,
  amount: number,
  options: PurchaseOptions = {}
) {
  const email = options.email || process.env.GGSEL_EMAIL || "";
  const ggselProductUrl =
    options.ggselProductUrl ||
    process.env.GGSEL_PRODUCT_URL ||
    "https://ggsel.net/catalog/product/24-7-avto-openrouter-popolnenie-balansa-bez-vxoda-api-kliuc-vybor-llm-4866282";
  const headless =
    options.headless !== undefined ? options.headless : process.env.HEADLESS !== "false";
  const tempDir = options.tempDir || "./temp";
  const onStatus = options.onStatus || (async (statusText) => console.log(statusText));
  const onScreenshot = options.onScreenshot || (async (filePath, caption) => {});

  // Ensure temp directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  await onStatus("🚀 Запуск браузера...");
  const proxyServer = process.env.PROXY_SERVER;
  const browser = await chromium.launch({
    headless,
    args: ["--disable-blink-features=AutomationControlled"], // bypass basic bot detection
    proxy: proxyServer
      ? {
          server: proxyServer,
          username: process.env.PROXY_USERNAME,
          password: process.env.PROXY_PASSWORD,
        }
      : undefined,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  try {
    await onStatus(`🌐 Переход на страницу оформления...`);
    const response = await page.goto(ggselProductUrl, { waitUntil: "load", timeout: 60000 });

    if (!response) {
      throw new Error("Не удалось загрузить страницу (нет ответа от сервера). Возможно, соединение заблокировано.");
    }

    const title = await page.title();
    if (
      title.includes("Just a moment") ||
      title.includes("Access denied") ||
      title.includes("Attention Required") ||
      title.includes("Forbidden") ||
      title.includes("DDoS-Guard") ||
      title.includes("Cloudflare")
    ) {
      throw new Error(`Доступ к сайту заблокирован защитой (Cloudflare/DDoS-Guard). Заголовок страницы: "${title}". Требуется ручное выполнение.`);
    }

    if (response.status() === 403 || response.status() === 503) {
      throw new Error(`Доступ заблокирован защитой Cloudflare (код ${response.status()}). Требуется ручное выполнение.`);
    }

    // Wait for the buy button to appear on the page (indicating successful React render)
    try {
      await page.waitForSelector('.btn-buy, .product-buy-btn, button:has-text("Купить")', { timeout: 20000 });
    } catch (e) {
      const pageTitle = await page.title();
      throw new Error(`Страница товара не загрузилась полностью (кнопка покупки не найдена). Заголовок страницы: "${pageTitle}". Возможно, сработал блок Cloudflare.`);
    }

    // Take screenshot of product page
    const step1Screenshot = path.join(tempDir, `step1_product_page_${Date.now()}.png`);
    await page.screenshot({ path: step1Screenshot });
    await onScreenshot(step1Screenshot, "Страница товара загружена");

    // 1. Fill Amount
    await onStatus(`✍️ Заполнение суммы: ${amount} USD...`);

    // Wait for the calculator inputs to render (React hydration)
    try {
      await page.waitForSelector('input[name="unitsToGet"], input.calc-input, input[name="unitsToPay"]', { timeout: 15000 });
    } catch (e) {
      await onStatus(`⚠️ Поля калькулятора не появились вовремя, пробуем продолжить...`);
    }

    const amountInputSelectors = [
      'input[name="unitsToGet"]', // Amount in USD
      "#unitsToGet",
      'input[name="unitsToPay"]', // Price in RUB
      "#unitsToPay",
      "input.calc-input",
    ];

    let amountInput = null;
    for (const selector of amountInputSelectors) {
      if (await page.isVisible(selector)) {
        amountInput = page.locator(selector);
        break;
      }
    }

    if (amountInput) {
      await amountInput.focus();
      await page.keyboard.press("Control+A");
      await page.keyboard.press("Delete");
      await amountInput.fill(amount.toString());
      await amountInput.press("Tab");
      await page.waitForTimeout(1000);
      await onStatus(`✅ Сумма заполнена.`);
    } else {
      await onStatus(
        `⚠️ Не удалось найти поле ввода суммы. Попробуем продолжить с суммой по умолчанию.`
      );
    }

    // 2. Fill Payment Link (Stripe Link)
    await onStatus(`✍️ Заполнение ссылки на оплату...`);

    // Wait for option fields to render (React hydration)
    try {
      await page.waitForSelector('input[name*="option_"], textarea[name*="option_"], input[placeholder*="Ссылка"], textarea[placeholder*="Ссылка"]', { timeout: 15000 });
    } catch (e) {
      await onStatus(`⚠️ Поле ввода ссылки не появилось вовремя, пробуем продолжить...`);
    }

    const paymentLinkSelectors = [
      'input[name="option_text_35856"]',
      'textarea[name="option_text_35856"]',
      'input[name*="option_text"]',
      'textarea[name*="option_text"]',
      'input[name*="option_"]',
      'textarea[name*="option_"]',
      'input[id*="option_"]',
      'textarea[id*="option_"]',
      'input[placeholder*="Ссылка"]',
      'textarea[placeholder*="Ссылка"]',
      'input[placeholder*="Link"]',
      'textarea[placeholder*="Link"]',
      'input[placeholder*="url"]',
      'textarea[placeholder*="url"]',
      "#option_text_35856",
    ];

    let paymentLinkInput = null;
    for (const selector of paymentLinkSelectors) {
      if (await page.isVisible(selector)) {
        paymentLinkInput = page.locator(selector);
        break;
      }
    }

    if (paymentLinkInput) {
      await paymentLinkInput.focus();
      await page.keyboard.press("Control+A");
      await page.keyboard.press("Delete");
      await paymentLinkInput.fill(paymentLink);
      await onStatus(`✅ Ссылка на оплату введена.`);
    } else {
      throw new Error(
        "Не удалось найти поле для ввода ссылки на оплату! Возможно, структура страницы изменилась."
      );
    }

    // Capture state before buying
    const beforeBuyScreenshot = path.join(tempDir, `step2_before_buy_${Date.now()}.png`);
    await page.screenshot({ path: beforeBuyScreenshot });
    await onScreenshot(beforeBuyScreenshot, 'Форма заполнена, нажимаем "Купить"');

    // 3. Click "Купить" (Buy)
    await onStatus(`🛒 Нажатие кнопки "Купить"...`);
    const buyButtonSelectors = [
      'button:has-text("Купить")',
      'a:has-text("Купить")',
      ".btn-buy",
      ".product-buy-btn",
      'button[type="submit"]',
    ];

    let clicked = false;
    for (const selector of buyButtonSelectors) {
      if (await page.isVisible(selector)) {
        await page.click(selector);
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      throw new Error('Кнопка "Купить" не найдена!');
    }

    await onStatus(`⏳ Ожидание перехода на страницу оплаты...`);
    await page.waitForURL(/payment\.ggsel\.com|oplata\.info|digiseller/, { timeout: 30000 });
    await onStatus(`🔗 Переход выполнен: ${page.url()}`);
    await page.waitForLoadState("networkidle");

    // 4. Fill Email
    await onStatus(`✍️ Ввод почты для получения заказа: ${email}...`);
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      "#email",
      'input[placeholder*="email"]',
      'input[placeholder*="Почта"]',
    ];

    let emailInput = null;
    for (const selector of emailSelectors) {
      if (await page.isVisible(selector)) {
        emailInput = page.locator(selector);
        break;
      }
    }

    if (emailInput) {
      await emailInput.focus();
      await page.keyboard.press("Control+A");
      await page.keyboard.press("Delete");
      await emailInput.fill(email);
      await onStatus(`✅ Почта введена.`);
    } else {
      await onStatus(
        `⚠️ Поле ввода email не найдено. Возможно, оно уже заполнено или форма отличается.`
      );
    }

    // 5. Select SBP Payment Method
    await onStatus(`💳 Выбор способа оплаты СБП (Система Быстрых Платежей)...`);
    const sbpSelectors = [
      "text=СБП",
      "text=Система быстрых платежей",
      'label:has-text("СБП")',
      ".payment-method-sbp",
      'img[alt*="СБП"]',
      'img[src*="sbp"]',
      'div:has-text("СБП")',
    ];

    let sbpSelected = false;
    for (const selector of sbpSelectors) {
      try {
        const locator = page.locator(selector).first();
        if (await locator.isVisible()) {
          await locator.click();
          sbpSelected = true;
          await onStatus(`✅ Выбран способ оплаты СБП.`);
          break;
        }
      } catch (err) {
        // continue
      }
    }

    if (!sbpSelected) {
      await onStatus(
        `⚠️ СБП не удалось выбрать автоматически. Будет использован способ по умолчанию.`
      );
    }

    // Take screenshot of payment method selection
    const methodScreenshot = path.join(tempDir, `step3_method_selected_${Date.now()}.png`);
    await page.screenshot({ path: methodScreenshot });
    await onScreenshot(methodScreenshot, 'Способ оплаты выбран, нажимаем "Оплатить"');

    // 6. Click "Оплатить" (Pay)
    await onStatus(`💸 Переход к оплате...`);
    const payButtonSelectors = [
      'button:has-text("Оплатить")',
      'input[type="submit"][value*="Оплатить"]',
      ".btn-pay",
      'button[type="submit"]',
    ];

    let payClicked = false;
    for (const selector of payButtonSelectors) {
      if (await page.isVisible(selector)) {
        await page.click(selector);
        payClicked = true;
        break;
      }
    }

    if (!payClicked) {
      throw new Error('Кнопка "Оплатить" не найдена!');
    }

    await onStatus(`⏳ Ожидание загрузки QR-кода СБП...`);
    await page.waitForTimeout(5000);

    // 7. Find SBP Link / QR Code
    let sbpLink: string | null = null;

    const links = await page.evaluate(() => {
      const hrefs: string[] = [];
      const doc = (globalThis as any).document;
      doc.querySelectorAll("a").forEach((a: any) => {
        if (a.href) hrefs.push(a.href);
      });
      doc.querySelectorAll("[onclick]").forEach((el: any) => {
        const code = el.getAttribute("onclick") || "";
        const match = code.match(/https:\/\/qr\.nspk\.ru\/[^\s'"]+/);
        if (match) hrefs.push(match[0]);
      });
      return hrefs;
    });

    sbpLink = links.find((l) => l.includes("qr.nspk.ru") || l.includes("link.nspk.ru")) || null;

    if (!sbpLink) {
      try {
        const sbpBtn = page.locator('a[href*="qr.nspk.ru"], a[href*="link.nspk.ru"]').first();
        if (await sbpBtn.isVisible()) {
          sbpLink = await sbpBtn.getAttribute("href");
        }
      } catch (e) {}
    }

    const qrScreenshot = path.join(tempDir, `step4_qr_code_${Date.now()}.png`);
    await page.screenshot({ path: qrScreenshot });

    const isRealSbpLink = sbpLink && (sbpLink.includes("qr.nspk.ru") || sbpLink.includes("link.nspk.ru"));

    if (options.onPaymentLink) {
      await options.onPaymentLink(isRealSbpLink ? sbpLink : null, qrScreenshot);
    }

    await onScreenshot(
      qrScreenshot,
      `Скриншот экрана оплаты. Ссылка СБП: ${sbpLink || "Не найдена (сканируйте QR-код)"}`
    );

    // 8. Wait and monitor for payment success
    await onStatus(`🔄 Ожидание подтверждения оплаты (проверка в течение 10 минут)...`);

    let isPaid = false;
    const startTime = Date.now();
    const timeoutMs = 10 * 60 * 1000; // 10 minutes

    while (Date.now() - startTime < timeoutMs) {
      const currentUrl = page.url();

      if (
        currentUrl.includes("/order/") ||
        currentUrl.includes("/info/") ||
        currentUrl.includes("success")
      ) {
        const deliverySection = page.locator(
          ".goods-delivery, .delivery-info, text=Товар, text=Уникальный код"
        );
        if ((await deliverySection.count()) > 0 || currentUrl.includes("/info/")) {
          isPaid = true;
          await onStatus(`🎉 Оплата подтверждена! Товар получен.`);
          const successScreenshot = path.join(tempDir, `step5_success_${Date.now()}.png`);
          await page.screenshot({ path: successScreenshot });
          await onScreenshot(
            successScreenshot,
            `Товар успешно оплачен и получен! Страница заказа: ${currentUrl}`
          );
          break;
        }
      }

      await page.waitForTimeout(5000); // Check every 5 seconds
    }

    if (!isPaid) {
      await onStatus(`⚠️ Время ожидания оплаты истекло или страница не обновилась.`);
    }

    await browser.close();
    return {
      success: true,
      sbpLink,
      qrScreenshotPath: qrScreenshot,
      isPaid,
    };
  } catch (error: any) {
    await onStatus(`❌ Ошибка в процессе автоматического пополнения: ${error.message}`);
    const errorScreenshot = path.join(tempDir, `error_${Date.now()}.png`);
    await page.screenshot({ path: errorScreenshot }).catch(() => {});
    await onScreenshot(errorScreenshot, `Ошибка: ${error.message}`);
    await browser.close().catch(() => {});
    throw error;
  }
}
