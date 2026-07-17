import { useGetUser, getGetUserQueryKey, useGetUserOrders, getGetUserOrdersQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatStars, formatDate } from "@/lib/utils";
import { OrderTypeBadge, StatusBadge } from "@/components/shared/Badges";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, ShoppingBag, Star, User } from "lucide-react";

export default function UserDetail() {
  const params = useParams();
  const userId = parseInt(params.id || "0", 10);

  const { data: user, isLoading: userLoading } = useGetUser(userId, {
    query: { queryKey: getGetUserQueryKey(userId), enabled: !!userId }
  });

  const { data: orders, isLoading: ordersLoading } = useGetUserOrders(userId, {
    query: { queryKey: getGetUserOrdersQueryKey(userId), enabled: !!userId }
  });

  if (userLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-32 mb-8" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-xl font-semibold mb-4">Пользователь не найден</h2>
        <Link href="/users">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> К пользователям</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <Link href="/users" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="mr-1 h-4 w-4" /> Пользователи
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
            {user.firstName} {user.lastName}
          </h1>
          {user.username && (
            <a href={`https://t.me/${user.username}`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                Профиль в Telegram
              </Button>
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2 border-b-0">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Профиль</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-4 border border-primary/20">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium leading-none">Telegram ID</p>
                  <p className="text-sm text-muted-foreground font-mono mt-1">{user.telegramId}</p>
                </div>
              </div>
              <div className="border-t border-border/50 pt-4">
                <p className="text-sm font-medium leading-none mb-1">Зарегистрирован</p>
                <p className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 border-b-0">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Заказы</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 mr-4 border border-blue-500/20">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{user.totalOrders}</p>
                <p className="text-sm text-muted-foreground">Всего заказов</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 border-b-0">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Потрачено всего</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 mr-4 border border-amber-500/20">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{formatStars(user.totalSpentStar)}</p>
                <p className="text-sm text-muted-foreground">Звёзд</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>История заказов</CardTitle>
          <CardDescription>Все заказы этого пользователя.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>№ заказа</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead className="text-right">Дата</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))
              ) : orders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Заказов не найдено
                  </TableCell>
                </TableRow>
              ) : (
                orders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">#{order.id}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
