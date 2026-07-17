import axios from "axios";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = "https://openrouter.ai/api/v1";

interface ProvisionedKey {
  key: string;
  name: string;
  label?: string;
  limit: number;
  usage: number;
  is_active: boolean;
  created_at: string;
}

interface CreateKeyResult {
  data: ProvisionedKey & { key: string };
}

/**
 * Create a provisioned OpenRouter API key with a USD credit limit.
 * @param name Display name for the key
 * @param limitUsd Credit limit in USD
 */
export async function createProvisionedKey(
  name: string,
  limitUsd: number
): Promise<{ key: string; hash: string }> {
  const resp = await axios.post<CreateKeyResult>(
    `${BASE_URL}/keys`,
    { name, limit: limitUsd },
    {
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  return {
    key: resp.data.data.key,
    hash: ((resp.data.data as unknown as Record<string, unknown>).hash as string) ?? "",
  };
}

/**
 * Get credits balance for a provisioned key by hash.
 */
export async function getKeyUsage(keyHash: string): Promise<{ usage: number; limit: number }> {
  const resp = await axios.get<{ data: ProvisionedKey }>(
    `${BASE_URL}/keys/${keyHash}`,
    {
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
    }
  );
  return { usage: resp.data.data.usage, limit: resp.data.data.limit };
}

/**
 * Calculate cost in Stars for N million tokens.
 * price = pricePerM * (1 + markup/100) * starRate * millions
 */
export function calcTokenCostInStars(
  pricePerMillionTokens: number,
  markupPercent: number,
  starRatePerUsd: number,
  millionsOfTokens: number
): number {
  const usdCost = pricePerMillionTokens * (1 + markupPercent / 100) * millionsOfTokens;
  return Math.ceil(usdCost * starRatePerUsd);
}

/**
 * Convert USD to Stars using the configured rate.
 */
export function usdToStars(usdAmount: number, starRatePerUsd: number): number {
  return Math.ceil(usdAmount * starRatePerUsd);
}
