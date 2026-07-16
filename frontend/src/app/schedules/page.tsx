"use client";

import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock, Loader2, AlertCircle, Plus, Trash2, Mail, Play, Pause } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import { schedulesApi, tasksApi, authFetcher } from "@/services/api";
import toast from "react-hot-toast";

interface Schedule {
  id: string;
  taskId: string;
  cronExpr: string;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
  notifyEmail: string | null;
  task: { id: string; name: string; type: string; status: string };
}

export default function SchedulesPage() {
  const { data: schedData, isLoading: schedLoading, mutate: mutateSchedules } = useSWR("/api/schedules", authFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  const { data: taskData } = useSWR("/api/tasks", authFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const schedules = useMemo(() => (schedData?.schedules || []) as Schedule[], [schedData]);
  const tasks = useMemo(() => (taskData?.tasks || []).filter((t: any) => t.status === "COMPLETED"), [taskData]);
  const loading = schedLoading;

  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState("");
  const [cronExpr, setCronExpr] = useState("0 */6 * * *");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!selectedTask) return toast.error("Select a task");
    if (!cronExpr) return toast.error("Enter a cron expression");
    setCreating(true);
    try {
      await schedulesApi.create({
        taskId: selectedTask,
        cronExpr,
        notifyEmail: email || undefined,
      });
      toast.success("Schedule created!");
      setShowCreate(false);
      setSelectedTask("");
      setEmail("");
      mutateSchedules();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await schedulesApi.toggle(id, enabled);
      toast.success(enabled ? "Schedule enabled" : "Schedule disabled");
      mutateSchedules();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await schedulesApi.delete(id);
      toast.success("Schedule deleted");
      mutateSchedules();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleTestEmail = async (id: string) => {
    try {
      const result = await schedulesApi.testEmail(id);
      toast.success(result.message || "Test email sent!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send test email");
    }
  };

  const cronPresets = [
    { label: "Every hour", value: "0 * * * *" },
    { label: "Every 6 hours", value: "0 */6 * * *" },
    { label: "Daily", value: "0 0 * * *" },
    { label: "Weekly", value: "0 0 * * 0" },
    { label: "Monthly", value: "0 0 1 * *" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
                <Clock className="h-5 w-5 text-white" />
              </div>
              Scheduled Scrapes
            </h1>
            <p className="text-muted-foreground mt-1">
              Automate recurring scrapes with email notifications on data changes
            </p>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)} variant="gradient">
            <Plus className="h-4 w-4 mr-1" /> New Schedule
          </Button>
        </div>

        {showCreate && (
          <Card className="border-emerald-500/20 animate-fade-in">
            <CardHeader>
              <CardTitle>Create Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Task</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={selectedTask}
                  onChange={(e) => setSelectedTask(e.target.value)}
                >
                  <option value="">Select a completed task...</option>
                  {tasks.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Schedule (Cron Expression)</Label>
                <Input
                  value={cronExpr}
                  onChange={(e) => setCronExpr(e.target.value)}
                  placeholder="0 */6 * * *"
                />
                <div className="flex gap-2 flex-wrap">
                  {cronPresets.map((preset) => (
                    <Button
                      key={preset.value}
                      size="sm"
                      variant={cronExpr === preset.value ? "default" : "outline"}
                      onClick={() => setCronExpr(preset.value)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notification Email (optional)</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={creating || !selectedTask}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  Create Schedule
                </Button>
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading schedules...</p>
            </CardContent>
          </Card>
        ) : schedules.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-12 text-center">
              <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">No schedules yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Create a schedule to automate recurring scrapes</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <Card key={schedule.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                        <Clock className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{schedule.task.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{schedule.cronExpr}</Badge>
                          <Badge variant={schedule.enabled ? "success" : "secondary"}>
                            {schedule.enabled ? "Active" : "Paused"}
                          </Badge>
                          {schedule.notifyEmail && (
                            <Badge variant="outline" className="text-xs">
                              <Mail className="h-3 w-3 mr-1" /> {schedule.notifyEmail}
                            </Badge>
                          )}
                        </div>
                        {schedule.lastRun && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last run: {new Date(schedule.lastRun).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {schedule.notifyEmail && (
                        <Button size="sm" variant="outline" onClick={() => handleTestEmail(schedule.id)}>
                          <Mail className="h-3 w-3 mr-1" /> Test
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggle(schedule.id, !schedule.enabled)}
                      >
                        {schedule.enabled ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(schedule.id)}>
                        <Trash2 className="h-3 w-3" />
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
