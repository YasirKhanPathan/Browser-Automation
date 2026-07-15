"use client";

import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Globe, Sparkles, ArrowRight, Loader2, ExternalLink, Download } from "lucide-react";
import { useState } from "react";
import { scrapeApi } from "@/services/api";
import toast from "react-hot-toast";

export default function ScrapePage() {
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!url) return toast.error("Please enter a URL");
    setLoading(true);
    try {
      const data = await scrapeApi.analyze(url);
      setResults(data);
      toast.success("Page analyzed successfully!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async () => {
    if (!results) return;
    setLoading(true);
    try {
      const data = await scrapeApi.execute(results.taskId || "new", url, results.selectors);
      toast.success(`Scraped ${data.count || 0} items!`);
      setResults(data);
    } catch (err: any) {
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
            AI Web Scraper
          </h1>
          <p className="text-muted-foreground mt-1">
            Enter a URL and tell the AI what data you want to extract
          </p>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                placeholder="https://example.com/products"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">What data do you want?</Label>
              <Textarea
                id="desc"
                placeholder="e.g., Extract all product names, prices, and ratings into a table"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleAnalyze} disabled={loading} variant="gradient" size="lg">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Analyze with AI
              </Button>
              {results && (
                <Button onClick={handleScrape} disabled={loading} size="lg">
                  <Download className="mr-2 h-4 w-4" />
                  Scrape Data
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {results && (
          <Card className="border-border/50 animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                AI Analysis Results
              </CardTitle>
              <CardDescription>
                The AI identified the following data structure on this page
              </CardDescription>
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
                      {results.data.map((row: any, i: number) => (
                        <tr key={i} className="border-b hover:bg-accent/50">
                          {Object.values(row).map((val: any, j: number) => (
                            <td key={j} className="px-4 py-2">
                              {String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Analysis complete. Click "Scrape Data" to extract the information.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
