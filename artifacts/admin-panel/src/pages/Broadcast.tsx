import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, Users, CheckCircle2, XCircle } from "lucide-react";

interface BroadcastResult {
  sent: number;
  failed: number;
  total: number;
}

export default function Broadcast() {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [parseMode, setParseMode] = useState<"Markdown" | "HTML">("Markdown");
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);

  const handleSend = async () => {
    if (!message.trim()) {
      toast({ title: "Введите текст сообщения", variant: "destructive" });
      return;
    }
    if (!confirm(`Отправить рассылку всем пользователям бота?`)) return;

    setIsSending(true);
    setResult(null);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/admin/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, parseMode }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BroadcastResult = await res.json();
      setResult(data);
      toast({ title: `Рассылка завершена: ${data.sent} доставлено, ${data.failed} ошибок` });
    } catch (err) {
      toast({ title: "Ошибка при отправке рассылки", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Рассылка</h1>
        <p className="text-muted-foreground mt-2">Отправьте сообщение всем пользователям бота.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Новое сообщение
          </CardTitle>
          <CardDescription>
            Сообщение будет доставлено всем пользователям, которые когда-либо запускали бота.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Формат текста</Label>
            <Select value={parseMode} onValueChange={(v) => setParseMode(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Markdown">Markdown</SelectItem>
                <SelectItem value="HTML">HTML</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="broadcast-msg">Текст сообщения</Label>
            <Textarea
              id="broadcast-msg"
              placeholder={parseMode === "Markdown"
                ? "Введите текст. Поддерживается *жирный*, _курсив_, `код`"
                : "Введите текст. Поддерживается <b>жирный</b>, <i>курсив</i>"}
              className="min-h-[200px] font-mono text-sm"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSending}
            />
            <p className="text-xs text-muted-foreground">{message.length} символов</p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSend} disabled={isSending || !message.trim()} className="min-w-[180px]">
              {isSending ? (
                <>
                  <span className="animate-spin mr-2 inline-block w-4 h-4 border-2 border-background border-t-transparent rounded-full" />
                  Отправка...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" /> Отправить рассылку
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Результат рассылки
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <p className="text-3xl font-bold text-foreground">{result.total}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Всего</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-emerald-400 flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-6 w-6" />{result.sent}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Доставлено</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-rose-400 flex items-center justify-center gap-1">
                  <XCircle className="h-6 w-6" />{result.failed}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Ошибок</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
