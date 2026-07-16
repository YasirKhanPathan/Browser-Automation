"use client";

import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart3, Clock, Download, ExternalLink, CheckCircle2, XCircle, Image, Loader2, Copy } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { exportApi, tasksApi, authFetcher } from "@/services/api";

export default function ResultsPage() {
  const { data, error, isLoading } = useSWR("/api/tasks", authFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const tasks = useMemo(() => data?.tasks || [], [data]);
  const [selected, setSelected] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleSelect = useCallback((task: any) => {
    setSelected(task);
    // Fetch full task details with results and screenshots
    setDetailLoading(true);
    tasksApi.get(task.id)
      .then((detail) => {
        setSelected(detail);
        setDetailLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch task detail:", err);
        toast.error("Failed to load task details");
        setDetailLoading(false);
      });
  }, []);

  const completed = useMemo(() => tasks.filter((t: any) => t.status === "COMPLETED"), [tasks]);

  const renderScreenshot = (task: any) => {
    const screenshots = task.screenshots || [];
    const resultData = task.results?.[0]?.data;

    // Try screenshots array first, then result data URL
    const imgUrl = screenshots.length > 0
      ? `/uploads/screenshots/${screenshots[0].filename}`
      : resultData?.url || null;

    if (!imgUrl) {
      return (
        <div className="text-center py-12">
          <Image className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">No screenshot available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-lg border overflow-hidden bg-muted/30">
          <img
            src={imgUrl}
            alt={task.name}
            className="w-full"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
            }}
          />
          <div className="hidden p-8 text-center text-muted-foreground">
            <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Failed to load image: {imgUrl}</p>
          </div>
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
        {screenshots.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Captured: {screenshots[0].pageUrl} — {new Date(screenshots[0].createdAt).toLocaleString()}
          </p>
        )}
      </div>
    );
  };

  const renderScrapeData = (task: any) => {
    const result = task.results?.[0];
    if (!result?.data) {
      return <p className="text-muted-foreground text-center py-8">No data available</p>;
    }

    const data = result.data;

    if (Array.isArray(data) && data.length > 0) {
      const keys = Object.keys(data[0]);
      return (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {keys.map((key) => (
                  <th key={key} className="px-4 py-2 text-left font-medium text-muted-foreground">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 100).map((row: any, i: number) => (
                <tr key={i} className="border-b hover:bg-accent/50">
                  {keys.map((key) => (
                    <td key={key} className="px-4 py-2 max-w-[300px] truncate">{String(row[key] ?? "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 100 && (
            <p className="text-xs text-muted-foreground text-center py-2">Showing 100 of {data.length} rows</p>
          )}
        </div>
      );
    }

    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      if (data.filled) {
        return (
          <div className="space-y-2">
            {Object.entries(data.filled).map(([field, value]) => {
              const failed = String(value).startsWith("failed");
              return (
                <div key={field} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="font-medium text-sm">{field}</span>
                  <span className={`text-sm ${failed ? "text-destructive" : "text-emerald-500"}`}>{String(value)}</span>
                </div>
              );
            })}
          </div>
        );
      }

      if (data.url) {
        return renderScreenshot(task);
      }
    }

    return (
      <div className="rounded-lg border p-4 bg-muted/30">
        <pre className="text-sm overflow-auto max-h-96 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
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
          <p className="text-muted-foreground mt-1">View and export data from your completed tasks</p>
        </div>

        {isLoading ? (
          <Card className="border-border/50">
            <CardContent className="p-12 text-center">
              <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading results...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-12 text-center">
              <XCircle className="h-8 w-8 mx-auto mb-3 text-destructive" />
              <p className="text-destructive font-medium">{error.message}</p>
            </CardContent>
          </Card>
        ) : completed.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">No completed tasks yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Run a scraper or screenshot task to see results here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-2">
              {completed.map((task: any) => (
                <Card
                  key={task.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selected?.id === task.id ? "border-violet-500 shadow-violet-500/10" : "border-border/50"
                  }`}
                  onClick={() => handleSelect(task)}
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
                      <div className="flex items-center gap-2">
                        <Badge variant="success">Completed</Badge>
                        <Button size="sm" variant="outline" onClick={() => { exportApi.download(selected.id, "csv"); toast.success("Downloading CSV..."); }}>
                          <Download className="h-3 w-3 mr-1" /> CSV
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { exportApi.download(selected.id, "json"); toast.success("Downloading JSON..."); }}>
                          <Download className="h-3 w-3 mr-1" /> JSON
                        </Button>
                        <Button size="sm" variant="outline" onClick={async () => { await exportApi.copyJson(selected.id); toast.success("Copied to clipboard!"); }}>
                          <Copy className="h-3 w-3 mr-1" /> Copy
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detailLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <Tabs defaultValue="data">
                        <TabsList>
                          <TabsTrigger value="data">Results</TabsTrigger>
                          <TabsTrigger value="screenshots">
                            Screenshots ({(selected.screenshots || []).length})
                          </TabsTrigger>
                          <TabsTrigger value="log">Execution Log</TabsTrigger>
                        </TabsList>
                        <TabsContent value="data" className="mt-4">
                          {renderScrapeData(selected)}
                        </TabsContent>
                        <TabsContent value="screenshots" className="mt-4">
                          {renderScreenshot(selected)}
                        </TabsContent>
                        <TabsContent value="log" className="mt-4">
                          {(selected.results || []).length === 0 ? (
                            <div className="text-center py-8">
                              <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                              <p className="text-sm text-muted-foreground">No execution log available</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {(selected.results || []).map((r: any, i: number) => (
                                <div key={i} className="rounded-lg border p-4 space-y-2">
                                  <div className="flex items-center gap-3">
                                    {r.status === "SUCCESS" ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                                    )}
                                    <Badge variant={r.status === "SUCCESS" ? "success" : "destructive"}>
                                      {r.status}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {r.duration ? `${r.duration}ms` : "—"}
                                    </span>
                                    <span className="text-xs text-muted-foreground ml-auto">
                                      {new Date(r.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                  {r.errorMsg && (
                                    <p className="text-xs text-destructive bg-destructive/5 rounded p-2">{r.errorMsg}</p>
                                  )}
                                  {r.data && (
                                    <pre className="text-xs text-muted-foreground bg-muted/50 rounded p-2 overflow-auto max-h-32 whitespace-pre-wrap">
                                      {typeof r.data === "string" ? r.data : JSON.stringify(r.data, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    )}
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
