"use client";

import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Layers, Loader2, AlertCircle, Download } from "lucide-react";
import { useState } from "react";
import { scrapeApi } from "@/services/api";
import toast from "react-hot-toast";

export default function CrawlPage() {
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [maxPages, setMaxPages] = useState(5);
  const [strategy, setStrategy] = useState<"ai" | "selector" | "sitemap">("ai");
  const [nextSelector, setNextSelector] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [crawlInfo, setCrawlInfo] = useState<any>(null);

  const handleCrawl = async () => {
    if (!url) return toast.error("Please enter a URL");
    let targetUrl = url;
    if (!url.startsWith("http")) targetUrl = `https://${url}`;
    setLoading(true);
    setError(null);
    try {
      const data = await scrapeApi.crawl(targetUrl, {
        description: description || undefined,
        maxPages,
        strategy,
        nextSelector: strategy === "selector" ? nextSelector : undefined,
      });
      setResults(data);
      setCrawlInfo({ pages: data.pages, errors: data.errors });
      toast.success(`Crawled ${data.pages || 0} pages — found ${data.aggregatedCount || 0} items`);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewResults = async () => {
    if (!results?.taskId) return;
    try {
      const taskData = await fetch(`/api/tasks/${results.taskId}`).then((r) => r.json());
      const resultData = taskData.results?.[0]?.data;
      if (resultData) {
        setResults((prev: any) => ({ ...prev, data: resultData }));
      }
    } catch (err: any) {
      toast.error("Failed to load results");
    }
  };

  const handleExportCSV = () => {
    const data = results?.data;
    if (!data?.length) return;
    const keys = Object.keys(data[0]).filter((k) => !k.startsWith("_"));
    const csv = [
      keys.join(","),
      ...data.map((row: any) =>
        keys.map((k) => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `crawl-${new URL(url).hostname}-${Date.now()}.csv`;
    a.click();
    toast.success("CSV downloaded!");
  };

  const handleExportJSON = () => {
    const data = results?.data;
    if (!data?.length) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `crawl-${new URL(url).hostname}-${Date.now()}.json`;
    a.click();
    toast.success("JSON downloaded!");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/25">
              <Layers className="h-5 w-5 text-white" />
            </div>
            Multi-Page Crawler
          </h1>
          <p className="text-muted-foreground mt-1">
            Crawl multiple pages — follow pagination, sitemaps, or AI-detected next-page links
          </p>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Start URL</Label>
              <Input
                id="url"
                placeholder="https://example.com/products"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">What data to extract? (optional)</Label>
              <Textarea
                id="desc"
                placeholder='e.g., "Product names and prices from each page"'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxPages">Max Pages</Label>
                <Input
                  id="maxPages"
                  type="number"
                  min={1}
                  max={50}
                  value={maxPages}
                  onChange={(e) => setMaxPages(parseInt(e.target.value) || 5)}
                />
              </div>

              <div className="space-y-2">
                <Label>Pagination Strategy</Label>
                <div className="flex gap-2">
                  <Button
                    variant={strategy === "ai" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStrategy("ai")}
                  >
                    AI
                  </Button>
                  <Button
                    variant={strategy === "selector" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStrategy("selector")}
                  >
                    Selector
                  </Button>
                  <Button
                    variant={strategy === "sitemap" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStrategy("sitemap")}
                  >
                    Sitemap
                  </Button>
                </div>
              </div>

              {strategy === "selector" && (
                <div className="space-y-2">
                  <Label htmlFor="nextSelector">Next Page Selector</Label>
                  <Input
                    id="nextSelector"
                    placeholder=".next-page a"
                    value={nextSelector}
                    onChange={(e) => setNextSelector(e.target.value)}
                  />
                </div>
              )}
            </div>

            <Button
              onClick={handleCrawl}
              disabled={loading || !url}
              variant="gradient"
              size="lg"
              className="w-full md:w-auto"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Layers className="mr-2 h-4 w-4" />
              )}
              {loading ? "Crawling..." : `Crawl ${maxPages} Pages`}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {crawlInfo && (
          <Card className="border-border/50 animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Crawl Results</span>
                <div className="flex gap-2">
                  {results?.data?.length > 0 && (
                    <>
                      <Button size="sm" variant="outline" onClick={handleExportCSV}>
                        <Download className="h-3 w-3 mr-1" /> CSV
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleExportJSON}>
                        <Download className="h-3 w-3 mr-1" /> JSON
                      </Button>
                    </>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{crawlInfo.pages}</p>
                  <p className="text-xs text-muted-foreground">Pages Crawled</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{results?.aggregatedCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Items Found</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{strategy.toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">Strategy</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{crawlInfo.errors?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
              </div>

              {crawlInfo.errors?.length > 0 && (
                <div className="space-y-1 mb-4">
                  {crawlInfo.errors.map((err: string, i: number) => (
                    <p key={i} className="text-xs text-destructive bg-destructive/5 rounded p-2">{err}</p>
                  ))}
                </div>
              )}

              {results?.data?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        {Object.keys(results.data[0]).filter((k) => !k.startsWith("_")).map((key) => (
                          <th key={key} className="px-4 py-2 text-left font-medium text-muted-foreground">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.data.slice(0, 100).map((row: any, i: number) => (
                        <tr key={i} className="border-b hover:bg-accent/50">
                          {Object.entries(row)
                            .filter(([k]) => !k.startsWith("_"))
                            .map(([_, val], j) => (
                              <td key={j} className="px-4 py-2 max-w-[300px] truncate">
                                {String(val)}
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {results.data.length > 100 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Showing 100 of {results.data.length} items
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No data collected yet</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
