"use client";

import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Loader2, Download, Maximize2 } from "lucide-react";
import { useState } from "react";
import { screenshotsApi } from "@/services/api";
import toast from "react-hot-toast";

export default function ScreenshotsPage() {
  const [url, setUrl] = useState("");
  const [fullPage, setFullPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [screenshots, setScreenshots] = useState<any[]>([]);

  const handleCapture = async () => {
    if (!url) return toast.error("Please enter a URL");
    setLoading(true);
    try {
      const data = await screenshotsApi.capture("manual", url, { fullPage });
      setScreenshots((prev) => [data, ...prev]);
      toast.success("Screenshot captured!");
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
              <Camera className="h-5 w-5 text-white" />
            </div>
            Screenshot Capture
          </h1>
          <p className="text-muted-foreground mt-1">
            Capture full-page or viewport screenshots of any website
          </p>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Page URL</Label>
              <Input
                id="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={fullPage}
                  onChange={(e) => setFullPage(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Full page screenshot
              </label>
            </div>
            <Button onClick={handleCapture} disabled={loading} variant="gradient" size="lg">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
              Capture Screenshot
            </Button>
          </CardContent>
        </Card>

        {screenshots.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {screenshots.map((s, i) => (
              <Card key={i} className="overflow-hidden border-border/50 animate-fade-in">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <Maximize2 className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <CardContent className="p-4">
                  <p className="text-sm font-medium truncate">{s.pageUrl || url}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(s.createdAt || Date.now()).toLocaleString()}</p>
                  <Button size="sm" variant="outline" className="mt-3 w-full" asChild>
                    <a href={s.url || "#"} download>
                      <Download className="mr-2 h-3 w-3" /> Download
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
