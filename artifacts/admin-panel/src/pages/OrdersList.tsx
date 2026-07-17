import { useState } from "react";
import { useListOrders, getListOrdersQueryKey, ListOrdersType, ListOrdersStatus } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatStars, formatDate } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { OrderTypeBadge, StatusBadge } from "@/components/shared/Badges";

export default function OrdersList() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<ListOrdersType | 'all'>('all');
  const [status, setStatus] = useState<ListOrdersStatus | 'all'>('all');
  const limit = 15;

  const queryParams = {
    page,
    limit,
    type: type === 'all' ? null : type as ListOrdersType,
    status: status === 'all' ? null : status as ListOrdersStatus
  };

  const { data, isLoading } = useListOrders(
    queryParams,
    { query: { queryKey: getListOrdersQueryKey(queryParams) } }
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Заказы</h1>
          <p className="text-muted-foreground mt-2">Просмотр и управление заказами.</p>
        </div>
        <div className="flex space-x-3 w-full sm:w-auto">
          <Select value={type ?? undefined} onValueChange={(val) => { setType(val as any); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Все типы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              <SelectItem value="openrouter">OpenRouter</SelectItem>
              <SelectItem value="api_key">API Ключ</SelectItem>
              <SelectItem value="subscription">Подписка</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status ?? undefined} onValueChange={(val) => { setStatus(val as any); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Все статусы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="pending">Ожидает</SelectItem>
              <SelectItem value="completed">Выполнен</SelectItem>
              <SelectItem value="failed">Ошибка</SelectItem>
              <SelectItem value="cancelled">Отменён</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>№ заказа</TableHead>
                <TableHead>Пользователь</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead className="text-right">Дата</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))
              ) : data?.orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Заказов нет
                  </TableCell>
                </TableRow>
              ) : (
                data?.orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">#{order.id}</TableCell>
                    <TableCell>
                      <Link href={`/users/${order.userId}`} className="font-medium text-foreground hover:text-primary transition-colors">
                        {order.userFirstName}
                      </Link>
                    </TableCell>
                    <TableCell><OrderTypeBadge type={order.type} /></TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatStars(order.amountStar)}</TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">{formatDate(order.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/orders/${order.id}`}>
                        <Button variant="ghost" size="sm">Открыть</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {data && data.total > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
              <div className="text-sm text-muted-foreground">
                Показано{" "}
                <span className="font-medium text-foreground">{(page - 1) * limit + 1}</span>
                {" "}–{" "}
                <span className="font-medium text-foreground">{Math.min(page * limit, data.total)}</span>
                {" "}из{" "}
                <span className="font-medium text-foreground">{data.total}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Назад
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page * limit >= data.total}>
                  Вперёд <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
