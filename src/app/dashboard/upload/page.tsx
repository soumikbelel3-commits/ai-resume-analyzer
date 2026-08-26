"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from "@/lib/upload-limits";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const ACCEPT = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
};

async function uploadResume(file: File) {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/resumes/upload", { method: "POST", body });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Upload failed");
  return json.data as { resume: { id: string } };
}

export default function UploadPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: uploadResume,
    onMutate: () => {
      setProgress(15);
      const timer = window.setInterval(() => {
        setProgress((p) => (p >= 90 ? p : p + 8));
      }, 400);
      return { timer };
    },
    onSuccess: async (data, _vars, ctx) => {
      if (ctx?.timer) window.clearInterval(ctx.timer);
      setProgress(100);
      await queryClient.invalidateQueries({ queryKey: ["resumes"] });
      toast.success("Resume uploaded and analyzed");
      router.push(`/dashboard/resumes/${data.resume.id}`);
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.timer) window.clearInterval(ctx.timer);
      setProgress(0);
      toast.error(error.message);
    },
  });

  const onDrop = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (!file) return;
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(`File must be ${MAX_UPLOAD_MB}MB or smaller`);
        return;
      }
      mutation.mutate(file);
    },
    [mutation],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxFiles: 1,
    disabled: mutation.isPending,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Upload resume</h1>
        <p className="text-muted-foreground mt-1">
          PDF or DOCX up to {MAX_UPLOAD_MB}MB. Parsing and ATS scoring run
          automatically.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Drop your file</CardTitle>
          <CardDescription>
            We extract text, structure fields, and score ATS readiness.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            {...getRootProps()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/40"
            }`}
          >
            <input {...getInputProps()} />
            {mutation.isPending ? (
              <Loader2 className="text-muted-foreground mb-3 size-8 animate-spin" />
            ) : (
              <FileUp className="text-muted-foreground mb-3 size-8" />
            )}
            <p className="font-medium">
              {isDragActive
                ? "Drop to upload"
                : "Drag & drop, or click to browse"}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Accepted: .pdf, .docx
            </p>
          </div>

          {mutation.isPending && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-muted-foreground text-sm">
                Uploading, parsing, and scoring…
              </p>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            disabled={mutation.isPending}
            onClick={() =>
              (
                document.querySelector(
                  'input[type="file"]',
                ) as HTMLInputElement | null
              )?.click()
            }
          >
            Choose file
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
