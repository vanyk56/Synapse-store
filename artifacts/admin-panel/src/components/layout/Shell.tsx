import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        {children}
      </main>
    </div>
  );
}
