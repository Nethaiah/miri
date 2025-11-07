import { z } from "zod"

// Helper function to count emojis in a string
function countEmojis(str: string): number {
  // Regex to match emojis (including compound emojis, skin tones, etc.)
  const emojiRegex = /[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu
  const matches = str.match(emojiRegex)
  return matches ? matches.length : 0
}

// Helper function to check if string is emoji-only
function isEmojiOnly(str: string): boolean {
  // Remove all emojis and check if anything remains
  const emojiRegex = /[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu
  const withoutEmojis = str.replace(emojiRegex, '').trim()
  return withoutEmojis.length === 0 && str.trim().length > 0
}

export const folderSchema = z.object({
  name: z
    .string()
    .min(1, "Folder name is required")
    .max(50, "Name must be 50 characters or less")
    .refine(
      (val) => {
        const emojiCount = countEmojis(val)
        return emojiCount <= 1
      },
      {
        message: "Only one emoji is allowed in the folder name",
      }
    )
    .refine(
      (val) => !isEmojiOnly(val),
      {
        message: "Folder name cannot be emoji only",
      }
    ),
  emoji: z.string().optional(), // Make emoji optional since it can be in the name or not
  description: z.string().optional(),
})

export type FolderFormData = z.infer<typeof folderSchema>