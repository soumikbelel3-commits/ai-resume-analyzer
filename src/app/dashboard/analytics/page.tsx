"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type AnalyticsPayload = {
  scoreHistory: Array<{
    id: string;
    name: string;
    version: number;
    createdAt: string;
    score: number | null;
    status: string;
  }>;
  totals: {
    resumes: number;
    analyzed: number;
    averageScore: number;
    bestScore: number;
  };
};

async function fetchAnalytics(): Promise<AnalyticsPayload> {
  const res = await fetch("/api/analytics");
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Failed");
  return json.data;
}

export default function AnalyticsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
  });

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics unavailable</CardTitle>
          <CardDescription>{(error as Error)?.message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const chartData = data.scoreHistory
    .filter((s) => s.score != null)
    .map((s) => ({
      name: s.name.slice(0, 18),
      score: s.score,
      date: new Date(s.createdAt).toLocaleDateString(),
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          ATS score history, versions, and improvement trends.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Resumes", data.totals.resumes],
          ["Analyzed", data.totals.analyzed],
          ["Average ATS", data.totals.averageScore],
          ["Best ATS", data.totals.bestScore],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-3xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ATS score history</CardTitle>
          <CardDescription>
            Scores across uploaded resume versions
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {chartData.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Upload and analyze resumes to populate this chart.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resume versions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.scoreHistory.map((item) => (
            <div
              key={item.id}
              className="border-border flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0"
            >
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-muted-foreground">
                  v{item.version} · {item.status} ·{" "}
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
              <p className="font-semibold">{item.score ?? "—"}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
