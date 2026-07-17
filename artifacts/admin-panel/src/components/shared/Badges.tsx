import { Badge } from "@/components/ui/badge";
import { OrderSummaryType, OrderSummaryStatus, OrderDetailType, OrderDetailStatus } from "@workspace/api-client-react/src/generated/api.schemas";

export function ProviderBadge({ provider }: { provider: string }) {
  const p = provider.toLowerCase();
  if (p === 'anthropic') return <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 uppercase text-[10px]">Anthropic</Badge>;
  if (p === 'openai') return <Badge className="bg-green-500/10 text-green-400 border-green-500/20 uppercase text-[10px]">OpenAI</Badge>;
  if (p === 'google') return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 uppercase text-[10px]">Google</Badge>;
  if (p === 'openrouter') return <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 uppercase text-[10px]">OpenRouter</Badge>;
  return <Badge variant="outline" className="uppercase text-[10px]">{provider}</Badge>;
}

export function OrderTypeBadge({ type }: { type: OrderSummaryType | OrderDetailType }) {
  if (type === 'openrouter') return <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20">OpenRouter</Badge>;
  if (type === 'api_key') return <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20">API Ключ</Badge>;
  if (type === 'subscription') return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20">Подписка</Badge>;
  return <Badge variant="outline">{type}</Badge>;
}

export function StatusBadge({ status }: { status: OrderSummaryStatus | OrderDetailStatus }) {
  if (status === 'completed') return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">Выполнен</Badge>;
  if (status === 'pending') return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20">Ожидает</Badge>;
  if (status === 'failed') return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20">Ошибка</Badge>;
  if (status === 'cancelled') return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-slate-500/20">Отменён</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}
