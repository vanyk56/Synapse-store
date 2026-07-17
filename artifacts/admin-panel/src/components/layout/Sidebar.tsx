import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Package,
  Cpu,
  ShoppingCart,
  Settings,
  Send,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Дашборд", icon: LayoutDashboard },
  { href: "/users", label: "Пользователи", icon: Users },
  { href: "/products", label: "Продукты", icon: Package },
  { href: "/ai-models", label: "AI Модели", icon: Cpu },
  { href: "/orders", label: "Заказы", icon: ShoppingCart },
  { href: "/broadcast", label: "Рассылка", icon: Send },
  { href: "/settings", label: "Настройки", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="fixed inset-y-0 left-0 w-64 border-r border-border bg-sidebar z-50 flex flex-col">
      <div className="flex items-center h-16 px-6 border-b border-border bg-sidebar-primary/5">
        <Cpu className="w-6 h-6 text-primary mr-3" />
        <span className="font-bold tracking-wide text-foreground uppercase text-sm flex items-center">
          Bot<span className="text-primary ml-1">Admin</span>
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
          Меню
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2.5 rounded-sm text-sm font-medium transition-all group",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "w-4 h-4 mr-3 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3 px-2 py-2">
          <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-xs border border-primary/30">
            OP
          </div>
          <div>
            <div className="text-sm font-medium leading-none text-foreground">Оператор</div>
            <div className="text-xs text-muted-foreground mt-1">Администратор</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
