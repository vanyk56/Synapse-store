import { useGetOrder, getGetOrderQueryKey, useCompleteOrder, useCancelOrder } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatStars, formatDate } from "@/lib/utils";
import { OrderTypeBadge, StatusBadge } from "@/components/shared/Badges";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";

export default function OrderDetail() {
  const params = useParams();
  const orderId = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useGetOrder(orderId, {
    query: { queryKey: getGetOrderQueryKey(orderId), enabled: !!orderId }
  });

  const completeOrder = useCompleteOrder();
  const cancelOrder = useCancelOrder();

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-32 mb-8" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-xl font-semibold mb-4">Заказ не найден</h2>
        <Link href="/orders">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> К заказам</Button>
        </Link>
      </div>
    );
  }

  const handleComplete = () => {
    if (confirm("Отметить заказ как выполненный?")) {
      completeOrder.mutate({ id: order.id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(order.id) });
          toast({ title: "Заказ выполнен" });
        },
        onError: () => toast({ title: "Ошибка при выполнении заказа", variant: "destructive" })
      });
    }
  };

  const handleCancel = () => {
    if (confirm("Отменить этот заказ?")) {
      cancelOrder.mutate({ id: order.id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(order.id) });
          toast({ title: "Заказ отменён" });
        },
        onError: () => toast({ title: "Ошибка при отмене заказа", variant: "destructive" })
      });
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <Link href="/orders" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="mr-1 h-4 w-4" /> Заказы
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono">
              #{order.id}
            </h1>
            <StatusBadge status={order.status} />
          </div>

          {order.status === 'pending' && (
            <div className="flex space-x-2">
              <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={handleCancel} disabled={cancelOrder.isPending}>
                <XCircle className="mr-2 h-4 w-4" /> Отменить
              </Button>
              <Button onClick={handleComplete} disabled={completeOrder.isPending}>
                <CheckCircle className="mr-2 h-4 w-4" /> Выполнен
              </Button>
            </div>
          )}
        </div>
      </div>

      {(() => {
        const meta = order.meta as Record<string, any> | null;
        const sbpLink = meta?.sbpLink;
        if (!sbpLink) return null;
        return (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h4 className="font-semibold text-emerald-500">Оплата заказа по СБП готова!</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Для завершения заказа перейдите по ссылке ниже и проведите платеж в мобильном банке.
              </p>
            </div>
            <a href={sbpLink} target="_blank" rel="noopener noreferrer">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                🔗 Оплатить по СБП
              </Button>
            </a>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Информация о заказе</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between border-b border-border/50 pb-4">
              <span className="text-muted-foreground">Тип</span>
              <OrderTypeBadge type={order.type} />
            </div>
            <div className="flex justify-between border-b border-border/50 pb-4">
              <span className="text-muted-foreground">Сумма</span>
              <span className="font-bold font-mono text-lg text-primary">{formatStars(order.amountStar)}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-4">
              <span className="text-muted-foreground">Создан</span>
              <span className="text-foreground">{formatDate(order.createdAt)}</span>
            </div>
            <div className="flex justify-between pb-2">
              <span className="text-muted-foreground">Обновлён</span>
              <span className="text-foreground">{formatDate(order.updatedAt)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Покупатель</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between border-b border-border/50 pb-4">
              <span className="text-muted-foreground">Имя</span>
              <Link href={`/users/${order.userId}`} className="font-medium text-primary hover:underline">
                {order.userFirstName}
              </Link>
            </div>
            <div className="flex justify-between pb-2">
              <span className="text-muted-foreground">Telegram ID</span>
              <span className="font-mono text-sm text-foreground">{order.userTelegramId}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Метаданные заказа</CardTitle>
            <CardDescription>Технические детали транзакции.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 rounded-sm border border-border p-4 font-mono text-sm overflow-x-auto">
              <pre className="text-muted-foreground">
                {JSON.stringify(order.meta, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
