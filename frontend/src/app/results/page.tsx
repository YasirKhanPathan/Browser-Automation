"use client";

import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart3, Clock, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { tasksApi } from "@/services/api";

export default function ResultsPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    tasksApi.list().then((data) => setTasks(data.tasks || [])).catch(() => {});
  }, []);

  const completed = tasks.filter((t) => t.status === "COMPLETED");

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            Results Viewer
          </h1>
          <p className="text-muted-foreground mt-1">
            View and export data from your completed tasks
          </p>
        </div>

        {completed.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">No completed tasks yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Run a scraper or form fill task to see results here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-2">
              {completed.map((task) => (
                <Card
                  key={task.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selected?.id === task.id ? "border-violet-500 shadow-violet-500/10" : "border-border/50"
                  }`}
                  onClick={() => setSelected(task)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{task.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {new Date(task.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="success">{task.type}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-2">
              {selected ? (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {selected.name}
                      <Badge variant="success">Completed</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="data">
                      <TabsList>
                        <TabsTrigger value="data">Data</TabsTrigger>
                        <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
                        <TabsTrigger value="log">Execution Log</TabsTrigger>
                      </TabsList>
                      <TabsContent value="data">
                        <div className="rounded-lg border p-4 bg-muted/30">
                          <pre className="text-sm overflow-auto max-h-96">
                            {JSON.stringify(selected.results?.[0]?.data || {}, null, 2)}
                          </pre>
                        </div>
                      </TabsContent>
                      <TabsContent value="screenshots">
                        <p className="text-muted-foreground text-center py-8">No screenshots for this task</p>
                      </TabsContent>
                      <TabsContent value="log">
                        <div className="space-y-2">
                          {(selected.results || []).map((r: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                              <Badge variant={r.status === "SUCCESS" ? "success" : "destructive"}>
                                {r.status}
                              </Badge>
                              <span className="text-sm">{r.duration ? `${r.duration}ms` : "—"}</span>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-border/50">
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">Select a task to view results</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
