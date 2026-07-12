import Link from "next/link";
import { FileText, Sparkles, Target } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const highlights = [
  {
    title: "ATS Scoring",
    description:
      "Evaluate formatting, keywords, and section completeness with clear section scores.",
    icon: Target,
  },
  {
    title: "AI Resume Review",
    description:
      "Get strengths, weaknesses, grammar notes, and rewrite suggestions powered by Gemini.",
    icon: Sparkles,
  },
  {
    title: "Job Match Analysis",
    description:
      "Compare your resume against a job description to surface missing skills and keywords.",
    icon: FileText,
  },
] as const;

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      <section className="space-y-4 text-center sm:text-left">
        <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          AI Resume Analyzer
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Improve resumes with ATS + AI feedback
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          Upload PDF/DOCX resumes, extract structured data, score ATS readiness,
          match job descriptions, and export reports — built as a local AI
          engineering project.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ size: "lg" }))}
          >
            Open dashboard
          </Link>
          <Link
            href="/dashboard/upload"
            className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
          >
            Upload a resume
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {highlights.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <div className="bg-muted mb-2 flex size-10 items-center justify-center rounded-lg">
                <item.icon className="size-5" aria-hidden />
              </div>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </main>
  );
}
