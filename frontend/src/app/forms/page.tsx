"use client";

import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormInput, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { formsApi } from "@/services/api";
import toast from "react-hot-toast";

export default function FormsPage() {
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!url) return toast.error("Please enter a URL");
    setLoading(true);
    try {
      const data = await formsApi.analyze(url);
      setResult(data);
      toast.success("Form analyzed!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFill = async () => {
    if (!result) return;
    setLoading(true);
    try {
      const data = await formsApi.execute(result.taskId || "new", url, result.fields);
      setResult(data);
      toast.success("Form filled successfully!");
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/25">
              <FormInput className="h-5 w-5 text-white" />
            </div>
            AI Form Filler
          </h1>
          <p className="text-muted-foreground mt-1">
            Describe the form and what to fill in — the AI handles the rest
          </p>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Form URL</Label>
              <Input
                id="url"
                placeholder="https://example.com/contact"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">What to fill in</Label>
              <Textarea
                id="desc"
                placeholder='e.g., Fill name as "John Doe", email as "john@example.com", message as "Hello!"'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleAnalyze} disabled={loading} variant="gradient" size="lg">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Analyze Form
              </Button>
              {result && (
                <Button onClick={handleFill} disabled={loading} size="lg">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Fill & Submit
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card className="border-border/50 animate-fade-in">
            <CardHeader>
              <CardTitle>Form Analysis</CardTitle>
              <CardDescription>Detected fields and values</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(result.fields || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="font-medium text-sm">{key}</span>
                    <span className="text-sm text-muted-foreground">{String(value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
