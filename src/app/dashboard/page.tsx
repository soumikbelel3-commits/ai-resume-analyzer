"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { FileText, Upload } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ResumeListItem = {
  id: string;
  originalName: string;
  status: string;
  createdAt: string;
  analyses: Array<{ overallScore: number | null }>;
  _count: { skills: number; analyses: number };
};

async function fetchResumes(): Promise<ResumeListItem[]> {
  const res = await fetch("/api/resumes");
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Failed to load");
  return json.data;
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["resumes"],
    queryFn: fetchResumes,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Upload resumes, track ATS scores, and run AI improvements.
          </p>
        </div>
        <Link href="/dashboard/upload" className={cn(buttonVariants())}>
          <Upload className="size-4" />
          Upload resume
        </Link>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      )}

      {error && (
        <Card>
          <CardHeader>
            <CardTitle>Could not load resumes</CardTitle>
            <CardDescription>{(error as Error).message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {data && data.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No resumes yet</CardTitle>
            <CardDescription>
              Upload a PDF or DOCX to generate your first ATS analysis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/upload" className={cn(buttonVariants())}>
              Get started
            </Link>
          </CardContent>
        </Card>
      )}

      {data && data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((resume) => (
            <Card
              key={resume.id}
              className="hover:bg-muted/30 transition-colors"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="text-muted-foreground size-4" />
                    <CardTitle className="text-base leading-snug">
                      {resume.originalName}
                    </CardTitle>
                  </div>
                  <Badge variant="secondary">{resume.status}</Badge>
                </div>
                <CardDescription>
                  {new Date(resume.createdAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <div className="text-muted-foreground text-sm">
                  ATS{" "}
                  <span className="text-foreground font-semibold">
                    {resume.analyses[0]?.overallScore ?? "—"}
                  </span>
                  <span className="mx-2">·</span>
                  {resume._count.skills} skills
                </div>
                <Link
                  href={`/dashboard/resumes/${resume.id}`}
                  className={cn(
                    buttonVariants({ size: "sm", variant: "outline" }),
                  )}
                >
                  Open
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
