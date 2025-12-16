import { z } from "zod"

// Simplified folder schema - no emojis, no categories
export const folderSchema = z.object({
  name: z
    .string()
    .min(1, "Folder name is required")
    .max(100, "Name must be 100 characters or less"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional(),
  color: z.string().optional(),
})

export type FolderFormData = z.infer<typeof folderSchema>