"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ParsedResume, SectionScores } from "@/types/resume";

type ResumeDetail = {
  id: string;
  originalName: string;
  status: string;
  rawText: string | null;
  parsedData: ParsedResume | null;
  analyses: Array<{
    id: string;
    type: string;
    overallScore: number | null;
    sectionScores: SectionScores | null;
    strengths: string[] | null;
    weaknesses: string[] | null;
    suggestions: string[] | null;
    grammarIssues: string[] | null;
    atsIssues: string[] | null;
    missingInfo: string[] | null;
    writingQuality: { score: number; summary: string } | null;
    matchPercentage: number | null;
    matchingSkills: string[] | null;
    missingSkills: string[] | null;
    missingKeywords: string[] | null;
    rawResponse: {
      bullets?: Array<{
        original: string;
        rewritten: string;
        improvements: string[];
      }>;
    } | null;
    createdAt: string;
  }>;
  skills: Array<{ id: string; name: string; category: string }>;
};

async function fetchResume(id: string): Promise<ResumeDetail> {
  const res = await fetch(`/api/resumes/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Failed");
  return json.data;
}

async function postAction(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Request failed");
  return json.data;
}

function ListBlock({
  title,
  items,
}: {
  title: string;
  items?: string[] | null;
}) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className="mb-2 font-medium">{title}</h3>
      <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function ResumeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();
  const [jobText, setJobText] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["resume", id],
    queryFn: () => fetchResume(id),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["resume", id] });
    await queryClient.invalidateQueries({ queryKey: ["resumes"] });
    await queryClient.invalidateQueries({ queryKey: ["analytics"] });
  };

  const reviewMutation = useMutation({
    mutationFn: () => postAction(`/api/resumes/${id}/review`),
    onSuccess: async () => {
      toast.success("Review complete");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const matchMutation = useMutation({
    mutationFn: () =>
      postAction(`/api/resumes/${id}/match`, {
        jobText,
        title: jobTitle || undefined,
      }),
    onSuccess: async () => {
      toast.success("Job match complete");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulletsMutation = useMutation({
    mutationFn: () => postAction(`/api/resumes/${id}/bullets`),
    onSuccess: async () => {
      toast.success("Bullets optimized");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const skillsQuery = useQuery({
    queryKey: ["skills", id],
    queryFn: async () => {
      const res = await fetch(`/api/resumes/${id}/skills`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed");
      return json.data as {
        technical: string[];
        soft: string[];
        missing: string[];
        trending: string[];
        coverage: number;
      };
    },
    enabled: Boolean(data?.parsedData),
  });

  if (isLoading) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resume unavailable</CardTitle>
          <CardDescription>
            {(error as Error)?.message ?? "Not found"}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const ats = data.analyses.find((a) => a.type === "ATS");
  const review = data.analyses.find((a) => a.type === "REVIEW");
  const match = data.analyses.find((a) => a.type === "JOB_MATCH");
  const bullets = data.analyses.find((a) => a.type === "BULLET_OPTIMIZE");
  const sectionChart = ats?.sectionScores
    ? Object.entries(ats.sectionScores).map(([name, score]) => ({
        name: name.replace(/([A-Z])/g, " $1"),
        score,
      }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {data.originalName}
            </h1>
            <Badge variant="secondary">{data.status}</Badge>
          </div>
          <p className="text-muted-foreground">
            {data.parsedData?.name ?? "Parsed candidate"} ·{" "}
            {data.parsedData?.email ?? "No email"} · ATS{" "}
            {ats?.overallScore ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              window.open(`/api/resumes/${id}/export?format=json`, "_blank")
            }
          >
            Export JSON
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              window.open(`/api/resumes/${id}/export?format=markdown`, "_blank")
            }
          >
            Export MD
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              window.open(`/api/resumes/${id}/export?format=pdf`, "_blank")
            }
          >
            Export PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ats">ATS</TabsTrigger>
          <TabsTrigger value="review">AI Review</TabsTrigger>
          <TabsTrigger value="match">Job Match</TabsTrigger>
          <TabsTrigger value="bullets">Bullets</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>ATS score</CardTitle>
                <CardDescription>Latest automated score</CardDescription>
              </CardHeader>
              <CardContent className="text-4xl font-semibold">
                {ats?.overallScore ?? "—"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
                <CardDescription>Extracted from resume</CardDescription>
              </CardHeader>
              <CardContent className="text-4xl font-semibold">
                {data.skills.length}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Experience roles</CardTitle>
                <CardDescription>Parsed positions</CardDescription>
              </CardHeader>
              <CardContent className="text-4xl font-semibold">
                {data.parsedData?.experience.length ?? 0}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Parsed summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{data.parsedData?.summary || "No summary extracted."}</p>
              <div className="flex flex-wrap gap-2">
                {data.skills.slice(0, 20).map((skill) => (
                  <Badge key={skill.id} variant="outline">
                    {skill.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Section scores</CardTitle>
              <CardDescription>
                Formatting, keywords, action verbs, and more
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {sectionChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectionChart}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis dataKey="name" hide />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar
                      dataKey="score"
                      fill="var(--color-primary)"
                      radius={6}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No ATS data yet.
                </p>
              )}
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <ListBlock title="" items={ats?.atsIssues} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <ListBlock title="" items={ats?.suggestions} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          <Button
            onClick={() => reviewMutation.mutate()}
            disabled={reviewMutation.isPending}
          >
            {reviewMutation.isPending ? "Reviewing…" : "Run AI review"}
          </Button>
          {review ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Strengths</CardTitle>
                </CardHeader>
                <CardContent>
                  <ListBlock title="" items={review.strengths} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Weaknesses</CardTitle>
                </CardHeader>
                <CardContent>
                  <ListBlock title="" items={review.weaknesses} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Grammar</CardTitle>
                </CardHeader>
                <CardContent>
                  <ListBlock title="" items={review.grammarIssues} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Writing quality</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-3xl font-semibold">
                    {review.writingQuality?.score ?? "—"}
                  </p>
                  <p className="text-muted-foreground">
                    {review.writingQuality?.summary}
                  </p>
                  <ListBlock title="Suggestions" items={review.suggestions} />
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No review yet. Works with Gemini when configured; otherwise uses
              rule-based analysis.
            </p>
          )}
        </TabsContent>

        <TabsContent value="match" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compare to a job description</CardTitle>
              <CardDescription>
                Paste a JD to calculate match %, missing skills, and keywords.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="job-title">Role title (optional)</Label>
                <Input
                  id="job-title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Senior Software Engineer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-text">Job description</Label>
                <Textarea
                  id="job-text"
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                  rows={8}
                  placeholder="Paste the full job description…"
                />
              </div>
              <Button
                onClick={() => matchMutation.mutate()}
                disabled={matchMutation.isPending || jobText.trim().length < 40}
              >
                {matchMutation.isPending ? "Matching…" : "Run match"}
              </Button>
            </CardContent>
          </Card>

          {match && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Match score</CardTitle>
                </CardHeader>
                <CardContent className="text-4xl font-semibold">
                  {match.matchPercentage}%
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Matching skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <ListBlock title="" items={match.matchingSkills} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Missing skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <ListBlock title="" items={match.missingSkills} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Missing keywords</CardTitle>
                </CardHeader>
                <CardContent>
                  <ListBlock title="" items={match.missingKeywords} />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="bullets" className="space-y-4">
          <Button
            onClick={() => bulletsMutation.mutate()}
            disabled={bulletsMutation.isPending}
          >
            {bulletsMutation.isPending ? "Optimizing…" : "Optimize bullets"}
          </Button>
          <div className="space-y-3">
            {(bullets?.rawResponse?.bullets ?? []).map((item) => (
              <Card key={item.original}>
                <CardHeader>
                  <CardTitle className="text-base">Before</CardTitle>
                  <CardDescription>{item.original}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm font-medium">After</p>
                  <p className="text-sm">{item.rewritten}</p>
                  <ListBlock title="Improvements" items={item.improvements} />
                </CardContent>
              </Card>
            ))}
            {!bullets && (
              <p className="text-muted-foreground text-sm">
                Run the optimizer to see before/after rewrites.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          {skillsQuery.data ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Technical</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {skillsQuery.data.technical.map((s) => (
                    <Badge key={s}>{s}</Badge>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Soft skills</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {skillsQuery.data.soft.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Coverage vs trending</CardTitle>
                  <CardDescription>
                    {skillsQuery.data.coverage}% of tracked trending skills
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {skillsQuery.data.trending.map((s) => (
                    <Badge key={s} variant="outline">
                      {s}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Missing from latest JD match</CardTitle>
                </CardHeader>
                <CardContent>
                  <ListBlock title="" items={skillsQuery.data.missing} />
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Loading skills…</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
