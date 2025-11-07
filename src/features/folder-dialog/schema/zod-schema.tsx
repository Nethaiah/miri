// src/features/notes/schema/folderSchema.ts
import { z } from "zod"

export const folderSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(50),
    emoji: z.string().min(1, "Please choose an emoji"),
  })
  .refine((data) => !!data.name && !!data.emoji, {
    message: "Name and emoji are required",
  })

export type FolderFormData = z.infer<typeof folderSchema>
