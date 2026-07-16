"use client";

import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, Trash2, RotateCcw, Clock, Loader2 } from "lucide-react";
import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { tasksApi, authFetcher } from "@/services/api";
import toast from "react-hot-toast";

export default function HistoryPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/tasks", authFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const tasks = useMemo(() => data?.tasks || [], [data]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await tasksApi.delete(id);
      mutate();
      toast.success("Task deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [mutate]);

  const handleRerun = useCallback(async (id: string) => {
    try {
      await tasksApi.execute(id);
      toast.success("Task re-running!");
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [mutate]);

  const statusVariant = useCallback((s: string) => {
    if (s === "COMPLETED") return "success";
    if (s === "FAILED") return "destructive";
    if (s === "RUNNING") return "warning";
    return "secondary";
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/25">
                <History className="h-5 w-5 text-white" />
              </div>
              Task History
            </h1>
            <p className="text-muted-foreground mt-1">
              All your automation tasks in one place
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          </div>
        ) : tasks.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-12 text-center">
              <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">No tasks yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tasks.map((task: any) => (
              <Card key={task.id} className="border-border/50 transition-all hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-2 w-2 rounded-full bg-violet-500" />
                      <div>
                        <p className="font-medium">{task.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(task.createdAt).toLocaleString()}
                          </span>
                          <span className="uppercase tracking-wider">{task.type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant(task.status) as any}>{task.status}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => handleRerun(task.id)}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(task.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
