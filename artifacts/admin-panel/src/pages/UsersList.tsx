import { useState } from "react";
import { useListUsers, getListUsersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatStars, formatDate } from "@/lib/utils";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useDebounce } from "@/hooks/use-debounce";

export default function UsersList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;

  const { data, isLoading } = useListUsers(
    { page, limit, search: debouncedSearch || undefined },
    { query: { queryKey: getListUsersQueryKey({ page, limit, search: debouncedSearch || undefined }) } }
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Пользователи</h1>
          <p className="text-muted-foreground mt-2">Управление пользователями бота.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по ID, имени..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Telegram ID</TableHead>
                <TableHead>Имя</TableHead>
                <TableHead>Юзернейм</TableHead>
                <TableHead className="text-right">Заказы</TableHead>
                <TableHead className="text-right">Потрачено</TableHead>
                <TableHead className="text-right">Регистрация</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Пользователи не найдены
                  </TableCell>
                </TableRow>
              ) : (
                data?.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{user.telegramId}</TableCell>
                    <TableCell>
                      <Link href={`/users/${user.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                        {user.firstName} {user.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {user.username ? (
                        <a href={`https://t.me/${user.username}`} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">
                          @{user.username}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">нет</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{user.totalOrders}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatStars(user.totalSpentStar)}</TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">{formatDate(user.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {data && data.total > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Показано{" "}
                <span className="font-medium text-foreground">{(page - 1) * limit + 1}</span>
                {" "}–{" "}
                <span className="font-medium text-foreground">{Math.min(page * limit, data.total)}</span>
                {" "}из{" "}
                <span className="font-medium text-foreground">{data.total}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Назад
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * limit >= data.total}
                >
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
