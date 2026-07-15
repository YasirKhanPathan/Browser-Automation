"use client";

import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Globe, Sparkles, Loader2, Download, AlertCircle } from "lucide-react";
import { useState } from "react";
import { scrapeApi } from "@/services/api";
import toast from "react-hot-toast";

export default function ScrapePage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScrape = async () => {
    if (!url) return toast.error("Please enter a URL");
    setLoading(true);
    setError(null);
    try {
      const data = await scrapeApi.execute("manual", url, {
        container: "body",
        fields: { text: "h1, h2, h3, p, a, li, td, th, span" },
      });
      setResults(data);
      toast.success(`Scraped ${data.count || 0} items!`);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
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
            Enter a URL to extract data from any website
          </p>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScrape()}
              />
            </div>
            <Button onClick={handleScrape} disabled={loading || !url} variant="gradient" size="lg">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
              {loading ? "Scraping..." : "Scrape Data"}
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
                <span>Scraped Data</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {results.count || 0} items
                </span>
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
                      {results.data.slice(0, 50).map((row: any, i: number) => (
                        <tr key={i} className="border-b hover:bg-accent/50">
                          {Object.values(row).map((val: any, j: number) => (
                            <td key={j} className="px-4 py-2 max-w-[300px] truncate">
                              {String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {results.data.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Showing 50 of {results.data.length} items
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No data found on this page
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
