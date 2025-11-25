import { z } from "zod";

export const noteCreateSchema = z.object({
  folderId: z.string().min(1),
  title: z.string().max(200).optional(),
  description: z.string().max(500).optional().nullable(),
  content: z.string().optional().nullable(),
});

export const noteUpdateSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().max(500).optional().nullable(),
  content: z.string().optional().nullable(),
});