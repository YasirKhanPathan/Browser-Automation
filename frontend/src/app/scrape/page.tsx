"use client";

import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Globe, Loader2, AlertCircle, Sparkles, Download, Monitor } from "lucide-react";
import { useState } from "react";
import { tasksApi, scrapeApi } from "@/services/api";
import toast from "react-hot-toast";

export default function ScrapePage() {
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"basic" | "smart">("basic");
  const [forcePlaywright, setForcePlaywright] = useState(false);

  const handleScrape = async () => {
    if (!url) return toast.error("Please enter a URL");
    let targetUrl = url;
    if (!url.startsWith("http")) targetUrl = `https://${url}`;
    setLoading(true);
    setError(null);
    try {
      if (mode === "smart" && description.trim()) {
        const data = await scrapeApi.smart(targetUrl, description, forcePlaywright ? "playwright" : "auto");
        setResults(data);
        toast.success(`Smart scrape complete — found ${data.count || 0} items`);
      } else {
        const hostname = new URL(targetUrl).hostname;
        const task = await tasksApi.create({
          name: `Scrape: ${hostname}`,
          type: "SCRAPE",
          description: `Scrape data from ${targetUrl}`,
          config: {
            url: targetUrl,
            selectors: { container: "body", fields: { text: "h1, h2, h3, p, a, li, td, th" } },
          },
        });

        const data = await scrapeApi.execute(task.id, targetUrl, {
          container: "body",
          fields: { text: "h1, h2, h3, p, a, li, td, th" },
        });
        setResults(data);
        toast.success(`Found ${data.count || 0} items — saved to results`);
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!results?.data?.length) return;
    const keys = Object.keys(results.data[0]);
    const csv = [
      keys.join(","),
      ...results.data.map((row: any) =>
        keys.map((k) => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `scrape-${new URL(url).hostname}-${Date.now()}.csv`;
    a.click();
    toast.success("CSV downloaded!");
  };

  const handleExportJSON = () => {
    if (!results?.data?.length) return;
    const blob = new Blob([JSON.stringify(results.data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `scrape-${new URL(url).hostname}-${Date.now()}.json`;
    a.click();
    toast.success("JSON downloaded!");
  };

  const handleCopyJSON = () => {
    if (!results?.data?.length) return;
    navigator.clipboard.writeText(JSON.stringify(results.data, null, 2));
    toast.success("Copied to clipboard!");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-500/25">
              <Globe className="h-5 w-5 text-white" />
            </div>
            Web Scraper
          </h1>
          <p className="text-muted-foreground mt-1">
            Extract data from any website — basic or AI-powered smart extraction
          </p>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-6 space-y-4">
            <div className="flex gap-2 mb-2">
              <Button
                variant={mode === "basic" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("basic")}
              >
                <Globe className="mr-1 h-3 w-3" /> Basic
              </Button>
              <Button
                variant={mode === "smart" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("smart")}
              >
                <Sparkles className="mr-1 h-3 w-3" /> Smart
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleScrape()}
              />
            </div>

            {mode === "smart" && (
              <div className="space-y-2 animate-fade-in">
                <Label htmlFor="desc">What data do you want?</Label>
                <Textarea
                  id="desc"
                  placeholder='e.g., "Get all product names and prices" or "Extract article titles and summaries"'
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Describe the data you want extracted — AI will structure the output accordingly
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forcePlaywright}
                      onChange={(e) => setForcePlaywright(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 accent-violet-500"
                    />
                    <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Force browser rendering</span>
                  </label>
                  <span className="text-xs text-muted-foreground/60">for JS-heavy sites</span>
                </div>
              </div>
            )}

            <Button
              onClick={handleScrape}
              disabled={loading || !url || (mode === "smart" && !description.trim())}
              variant="gradient"
              size="lg"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : mode === "smart" ? (
                <Sparkles className="mr-2 h-4 w-4" />
              ) : (
                <Globe className="mr-2 h-4 w-4" />
              )}
              {loading
                ? mode === "smart"
                  ? "AI Extracting..."
                  : "Scraping..."
                : mode === "smart"
                  ? "Smart Scrape"
                  : "Scrape Data"}
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

        {results && (
          <Card className="border-border/50 animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Scraped Data</span>
                  {mode === "smart" && <Badge variant="default"><Sparkles className="h-3 w-3 mr-1" />AI</Badge>}
                  {results.engine && (
                    <Badge variant="outline" className="text-xs">
                      {results.engine === "playwright" ? "Browser" : "Lightweight"}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-normal text-muted-foreground">
                    {results.count || 0} items
                  </span>
                  {results.data?.length > 0 && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={handleExportCSV}>
                        <Download className="h-3 w-3 mr-1" /> CSV
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleExportJSON}>
                        <Download className="h-3 w-3 mr-1" /> JSON
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCopyJSON}>
                        Copy
                      </Button>
                    </div>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {results.data && results.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        {Object.keys(results.data[0]).map((key) => (
                          <th key={key} className="px-4 py-2 text-left font-medium text-muted-foreground">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.data.slice(0, 100).map((row: any, i: number) => (
                        <tr key={i} className="border-b hover:bg-accent/50">
                          {Object.values(row).map((val: any, j: number) => (
                            <td key={j} className="px-4 py-2 max-w-[400px] truncate">
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
                <p className="text-muted-foreground text-center py-4">No data found</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
