import { z } from "zod";

export const educationSchema = z.object({
  institution: z.string(),
  degree: z.string().optional(),
  field: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  details: z.string().optional(),
});

export const experienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  bullets: z.array(z.string()).default([]),
});

export const projectSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  technologies: z.array(z.string()).default([]),
  bullets: z.array(z.string()).default([]),
  url: z.string().optional(),
});

export const certificationSchema = z.object({
  name: z.string(),
  issuer: z.string().optional(),
  date: z.string().optional(),
});

export const linkSchema = z.object({
  label: z.string(),
  url: z.string(),
});

export const parsedResumeSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  summary: z.string().optional(),
  location: z.string().optional(),
  education: z.array(educationSchema).default([]),
  experience: z.array(experienceSchema).default([]),
  projects: z.array(projectSchema).default([]),
  skills: z.array(z.string()).default([]),
  certifications: z.array(certificationSchema).default([]),
  links: z.array(linkSchema).default([]),
});

export type ParsedResume = z.infer<typeof parsedResumeSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Project = z.infer<typeof projectSchema>;

export const sectionScoresSchema = z.object({
  formatting: z.number().min(0).max(100),
  readability: z.number().min(0).max(100),
  contactInformation: z.number().min(0).max(100),
  experience: z.number().min(0).max(100),
  skills: z.number().min(0).max(100),
  education: z.number().min(0).max(100),
  actionVerbs: z.number().min(0).max(100),
  keywords: z.number().min(0).max(100),
  sectionCompleteness: z.number().min(0).max(100),
});

export type SectionScores = z.infer<typeof sectionScoresSchema>;

export const atsResultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  sectionScores: sectionScoresSchema,
  issues: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
});

export type AtsResult = z.infer<typeof atsResultSchema>;

export const reviewResultSchema = z.object({
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  missingInformation: z.array(z.string()),
  atsIssues: z.array(z.string()),
  grammarIssues: z.array(z.string()),
  writingQuality: z.object({
    score: z.number().min(0).max(100),
    summary: z.string(),
  }),
  suggestions: z.array(z.string()),
});

export type ReviewResult = z.infer<typeof reviewResultSchema>;

export const jobMatchResultSchema = z.object({
  matchPercentage: z.number().min(0).max(100),
  matchingSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  suggestedImprovements: z.array(z.string()),
});

export type JobMatchResult = z.infer<typeof jobMatchResultSchema>;

export const bulletRewriteSchema = z.object({
  original: z.string(),
  rewritten: z.string(),
  improvements: z.array(z.string()),
});

export const bulletOptimizeResultSchema = z.object({
  bullets: z.array(bulletRewriteSchema),
});

export type BulletOptimizeResult = z.infer<typeof bulletOptimizeResultSchema>;
