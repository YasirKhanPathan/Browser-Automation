"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Globe,
  Layers,
  FormInput,
  Camera,
  Clock,
  Webhook,
  History,
  BarChart3,
  Bot,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scrape", label: "AI Scraper", icon: Globe },
  { href: "/crawl", label: "Multi-Page Crawl", icon: Layers },
  { href: "/forms", label: "Form Fill", icon: FormInput },
  { href: "/screenshots", label: "Screenshots", icon: Camera },
  { href: "/schedules", label: "Schedules", icon: Clock },
  { href: "/webhooks", label: "Webhooks & API", icon: Webhook },
  { href: "/results", label: "Results", icon: BarChart3 },
  { href: "/history", label: "History", icon: History },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card/50 backdrop-blur-xl transition-transform duration-200",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-500/25">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">BrowserBot</h1>
              <p className="text-[10px] text-muted-foreground">AI Automation</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-violet-500/10 to-purple-500/10 text-violet-500 shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isActive ? "text-violet-500" : "text-muted-foreground"
                    )}
                  />
                  {item.label}
                  {isActive && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-500" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t p-3">
            <div className="rounded-lg bg-gradient-to-br from-violet-500/5 to-purple-500/5 p-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">v1.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
