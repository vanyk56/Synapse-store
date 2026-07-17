import { useGetDashboard, getGetDashboardQueryKey, useGetRecentOrders, getGetRecentOrdersQueryKey, useGetRevenueChart, getGetRevenueChartQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatStars, formatNumber, formatDate } from "@/lib/utils";
import { OrderTypeBadge, StatusBadge } from "@/components/shared/Badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Users, ShoppingCart, Star, CheckCircle, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

function DashboardStatCard({ title, value, subvalue, icon: Icon, isLoading }: any) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="flex flex-col">
                <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
                {subvalue && <span className="text-xs text-muted-foreground mt-1">{subvalue}</span>}
              </div>
            )}
          </div>
          <div className="p-3 bg-primary/10 rounded-sm border border-primary/20">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboard({ query: { queryKey: getGetDashboardQueryKey() } });
  const { data: recentOrders, isLoading: ordersLoading } = useGetRecentOrders({ limit: 5 }, { query: { queryKey: getGetRecentOrdersQueryKey({ limit: 5 }) } });
  const { data: chartData, isLoading: chartLoading } = useGetRevenueChart({ query: { queryKey: getGetRevenueChartQueryKey() } });

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Дашборд</h1>
        <p className="text-muted-foreground mt-2">Обзор работы бота AI-подписок.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardStatCard
          title="Общая выручка"
          value={stats ? formatStars(stats.totalRevenueStar) : ""}
          subvalue={stats ? `+${formatStars(stats.revenueToday)} сегодня` : ""}
          icon={Star}
          isLoading={statsLoading}
        />
        <DashboardStatCard
          title="Пользователи"
          value={stats ? formatNumber(stats.totalUsers) : ""}
          subvalue={stats ? `+${stats.newUsersToday} сегодня / +${stats.newUsersThisWeek} за неделю` : ""}
          icon={Users}
          isLoading={statsLoading}
        />
        <DashboardStatCard
          title="Заказы"
          value={stats ? formatNumber(stats.totalOrders) : ""}
          icon={ShoppingCart}
          isLoading={statsLoading}
        />
        <DashboardStatCard
          title="Выполненных заказов"
          value={stats ? formatNumber(stats.completedOrders) : ""}
          subvalue={stats ? `${stats.pendingOrders} ожидает` : ""}
          icon={CheckCircle}
          isLoading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-primary" />
              Выручка (последние 30 дней)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px] w-full">
              {chartLoading ? (
                <Skeleton className="w-full h-full" />
              ) : chartData && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorStars" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => value > 1000 ? `${(value/1000).toFixed(1)}k` : value}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                      itemStyle={{ color: 'hsl(var(--primary))' }}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('ru-RU', { month: 'long', day: 'numeric', year: 'numeric' })}
                    />
                    <Area type="monotone" dataKey="stars" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorStars)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">Нет данных</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Заказы по типу</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : stats?.ordersByType ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                    <span className="text-sm">OpenRouter</span>
                  </div>
                  <span className="font-bold">{formatNumber(stats.ordersByType.openrouter)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                    <span className="text-sm">API Ключ</span>
                  </div>
                  <span className="font-bold">{formatNumber(stats.ordersByType.api_key)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span className="text-sm">Подписка</span>
                  </div>
                  <span className="font-bold">{formatNumber(stats.ordersByType.subscription)}</span>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm text-muted-foreground">Последние заказы</CardTitle>
          <Link href="/orders" className="text-xs text-primary hover:underline">Все заказы</Link>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пользователь</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead className="text-right">Дата</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : recentOrders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Заказов пока нет
                  </TableCell>
                </TableRow>
              ) : recentOrders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link href={`/users/${order.userId}`} className="font-medium text-foreground hover:text-primary transition-colors">
                      {order.userFirstName}
                    </Link>
                  </TableCell>
                  <TableCell><OrderTypeBadge type={order.type} /></TableCell>
                  <TableCell><StatusBadge status={order.status} /></TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatStars(order.amountStar)}</TableCell>
                  <TableCell className="text-right text-muted-foreground text-xs">{formatDate(order.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
