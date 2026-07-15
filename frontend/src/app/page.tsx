"use client";

import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Globe,
  FormInput,
  Camera,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { tasksApi } from "@/services/api";
import { AiTaskCreator } from "@/components/ai-task-creator";

interface Stats {
  total: number;
  completed: number;
  failed: number;
  running: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, failed: 0, running: 0 });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  useEffect(() => {
    tasksApi.list().then((data) => {
      const tasks = data.tasks || [];
      setStats({
        total: tasks.length,
        completed: tasks.filter((t: any) => t.status === "COMPLETED").length,
        failed: tasks.filter((t: any) => t.status === "FAILED").length,
        running: tasks.filter((t: any) => t.status === "RUNNING" || t.status === "PENDING").length,
      });
      setRecentTasks(tasks.slice(0, 5));
    }).catch(() => {});
  }, []);

  const statCards = [
    { label: "Total Tasks", value: stats.total, icon: TrendingUp, color: "from-violet-500 to-purple-600", shadow: "shadow-violet-500/25" },
    { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "from-emerald-500 to-teal-600", shadow: "shadow-emerald-500/25" },
    { label: "Failed", value: stats.failed, icon: XCircle, color: "from-rose-500 to-pink-600", shadow: "shadow-rose-500/25" },
    { label: "Running", value: stats.running, icon: Clock, color: "from-amber-500 to-orange-600", shadow: "shadow-amber-500/25" },
  ];

  const quickActions = [
    { label: "AI Scraper", desc: "Extract data from any website", href: "/scrape", icon: Globe, gradient: "from-violet-500 to-purple-600" },
    { label: "Form Fill", desc: "Auto-fill web forms", href: "/forms", icon: FormInput, gradient: "from-blue-500 to-cyan-600" },
    { label: "Screenshots", desc: "Capture full page screenshots", href: "/screenshots", icon: Camera, gradient: "from-emerald-500 to-teal-600" },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-violet-500 to-purple-600 bg-clip-text text-transparent">
              BrowserBot
            </span>
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered browser automation at your fingertips
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} ${stat.shadow} shadow-lg`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-violet-500" />
            Quick Actions
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <Card className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 border-border/50 hover:border-violet-500/30">
                  <CardContent className="p-6">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${action.gradient} shadow-lg mb-4`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-lg">{action.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{action.desc}</p>
                    <div className="mt-4 flex items-center text-sm text-violet-500 font-medium group-hover:gap-2 transition-all">
                      Get started <ArrowRight className="h-4 w-4 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <AiTaskCreator />
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No tasks yet. Create your first automation!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTasks.map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent/50">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-violet-500" />
                        <div>
                          <p className="font-medium text-sm">{task.name}</p>
                          <p className="text-xs text-muted-foreground">{task.type}</p>
                        </div>
                      </div>
                      <Badge variant={task.status === "COMPLETED" ? "success" : task.status === "FAILED" ? "destructive" : "secondary"}>
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
