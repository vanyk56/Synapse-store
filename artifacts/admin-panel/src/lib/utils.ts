import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatStars(amount: number) {
  return `⭐ ${new Intl.NumberFormat('ru-RU').format(amount)}`;
}

/** Показывает сумму в рублях (1 USD = 100 ₽) */
export function formatRUB(usdAmount: number) {
  const rubAmount = usdAmount * 100;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 2,
  }).format(rubAmount);
}

/** Оставлено для обратной совместимости */
export function formatUSD(amount: number) {
  return formatRUB(amount);
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat('ru-RU').format(num);
}
