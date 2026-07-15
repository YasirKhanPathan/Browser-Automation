"use client";

import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart3, Clock, Download, ExternalLink, Camera, CheckCircle2, XCircle, Image } from "lucide-react";
import { useEffect, useState } from "react";
import { tasksApi } from "@/services/api";

export default function ResultsPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    tasksApi.list().then((data) => setTasks(data.tasks || [])).catch(() => {});
  }, []);

  const completed = tasks.filter((t) => t.status === "COMPLETED");

  const renderData = (task: any) => {
    const result = task.results?.[0];
    if (!result?.data) return <p className="text-muted-foreground text-center py-8">No data available</p>;

    const data = result.data;

    // Screenshot task — show image
    if (task.type === "SCREENSHOT") {
      const imgUrl = data.url || (task.screenshots?.[0] ? `/uploads/screenshots/${task.screenshots[0].filename}` : null);
      if (imgUrl) {
        return (
          <div className="space-y-4">
            <div className="rounded-lg border overflow-hidden bg-muted/30">
              <img src={imgUrl} alt={task.name} className="w-full" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <a href={imgUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1 h-3 w-3" /> Open Full Size
                </a>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={imgUrl} download>
                  <Download className="mr-1 h-3 w-3" /> Download
                </a>
              </Button>
            </div>
          </div>
        );
      }
    }

    // Scrape task — show table
    if (task.type === "SCRAPE" && Array.isArray(data) && data.length > 0) {
      const keys = Object.keys(data[0]);
      return (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {keys.map((key) => (
                  <th key={key} className="px-4 py-2 text-left font-medium text-muted-foreground">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 100).map((row: any, i: number) => (
                <tr key={i} className="border-b hover:bg-accent/50">
                  {keys.map((key) => (
                    <td key={key} className="px-4 py-2 max-w-[300px] truncate">
                      {String(row[key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 100 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Showing 100 of {data.length} rows
            </p>
          )}
        </div>
      );
    }

    // Form fill task — show field results
    if (task.type === "FORM_FILL" && data.filled) {
      return (
        <div className="space-y-2">
          {Object.entries(data.filled).map(([field, value]) => {
            const failed = String(value).startsWith("failed");
            return (
              <div key={field} className="flex items-center justify-between rounded-lg border p-3">
                <span className="font-medium text-sm">{field}</span>
                <span className={`text-sm ${failed ? "text-destructive" : "text-emerald-500"}`}>
                  {String(value)}
                </span>
              </div>
            );
          })}
        </div>
      );
    }

    // Default — show JSON
    return (
      <div className="rounded-lg border p-4 bg-muted/30">
        <pre className="text-sm overflow-auto max-h-96 whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  const renderScreenshots = (task: any) => {
    const screenshots = task.screenshots || [];
    const resultData = task.results?.[0]?.data;

    // Also check result data for screenshot URL
    if (screenshots.length === 0 && resultData?.url) {
      return (
        <div className="space-y-4">
          <div className="rounded-lg border overflow-hidden bg-muted/30">
            <img src={resultData.url} alt={task.name} className="w-full" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <a href={resultData.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-3 w-3" /> Open
              </a>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={resultData.url} download>
                <Download className="mr-1 h-3 w-3" /> Download
              </a>
            </Button>
          </div>
        </div>
      );
    }

    if (screenshots.length === 0) {
      return (
        <div className="text-center py-12">
          <Image className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">No screenshots for this task</p>
        </div>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {screenshots.map((s: any) => (
          <div key={s.id} className="rounded-lg border overflow-hidden">
            <div className="bg-muted/30">
              <img
                src={`/uploads/screenshots/${s.filename}`}
                alt={s.pageUrl}
                className="w-full"
              />
            </div>
            <div className="p-3">
              <p className="text-xs text-muted-foreground truncate">{s.pageUrl}</p>
              <p className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleString()}</p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" className="flex-1" asChild>
                  <a href={`/uploads/screenshots/${s.filename}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1 h-3 w-3" /> View
                  </a>
                </Button>
                <Button size="sm" variant="outline" className="flex-1" asChild>
                  <a href={`/uploads/screenshots/${s.filename}`} download>
                    <Download className="mr-1 h-3 w-3" /> Save
                  </a>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

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
                Run a scraper or screenshot task to see results here
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
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{task.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={task.type === "SCRAPE" ? "default" : task.type === "SCREENSHOT" ? "success" : "secondary"} className="text-[10px]">
                            {task.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(task.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
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
                      <span className="truncate">{selected.name}</span>
                      <Badge variant="success">Completed</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="data">
                      <TabsList>
                        <TabsTrigger value="data">Results</TabsTrigger>
                        <TabsTrigger value="screenshots">
                          Screenshots ({(selected.screenshots || []).length})
                        </TabsTrigger>
                        <TabsTrigger value="log">Execution Log</TabsTrigger>
                      </TabsList>
                      <TabsContent value="data" className="mt-4">
                        {renderData(selected)}
                      </TabsContent>
                      <TabsContent value="screenshots" className="mt-4">
                        {renderScreenshots(selected)}
                      </TabsContent>
                      <TabsContent value="log" className="mt-4">
                        <div className="space-y-2">
                          {(selected.results || []).map((r: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                              {r.status === "SUCCESS" ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive shrink-0" />
                              )}
                              <Badge variant={r.status === "SUCCESS" ? "success" : "destructive"}>
                                {r.status}
                              </Badge>
                              <span className="text-sm">{r.duration ? `${r.duration}ms` : "—"}</span>
                              {r.errorMsg && (
                                <span className="text-xs text-destructive truncate flex-1">{r.errorMsg}</span>
                              )}
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
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
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
