import { z } from "zod"

// Helper function to count emojis in a string
function countEmojis(str: string): number {
  // Use Intl.Segmenter to properly count grapheme clusters (visual characters)
  // This handles compound emojis, skin tones, and variation selectors correctly
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })
  const segments = Array.from(segmenter.segment(str))
  
  // Count segments that contain emoji characters
  let emojiCount = 0
  const emojiRegex = /\p{Emoji}/u
  
  for (const segment of segments) {
    if (emojiRegex.test(segment.segment)) {
      emojiCount++
    }
  }
  
  return emojiCount
}

// Helper function to check if string is emoji-only
function isEmojiOnly(str: string): boolean {
  // Use Intl.Segmenter to properly handle grapheme clusters
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })
  const segments = Array.from(segmenter.segment(str))
  
  const emojiRegex = /\p{Emoji}/u
  let hasEmoji = false
  let hasText = false
  
  for (const segment of segments) {
    const char = segment.segment.trim()
    if (char.length === 0) continue // Skip whitespace
    
    if (emojiRegex.test(char)) {
      hasEmoji = true
    } else {
      hasText = true
    }
  }
  
  // Return true only if there's emoji but no text
  return hasEmoji && !hasText
}

// Category type schema
export const categoryTypeSchema = z.enum(["Notes", "Journals", "Kanbans"])
export type CategoryType = z.infer<typeof categoryTypeSchema>

// Folder schema - used when creating/updating folders
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
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
})

export type FolderFormData = z.infer<typeof folderSchema>

// Folder with parent category (for API operations)
export const folderWithParentSchema = folderSchema.extend({
  parent: categoryTypeSchema,
})

export type FolderWithParentData = z.infer<typeof folderWithParentSchema>