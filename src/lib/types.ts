/**
 * Shared TypeScript types for the application
 * Re-exported from database schema and validation schemas for convenience
 */

import type { CategoryType as DBCategoryType } from "@/db/schema"

// Re-export from database schema
export type {
  CategoryType,
  Folder,
  NewFolder,
} from "@/db/schema"

// Re-export from validation schemas
export type {
  FolderFormData,
  FolderWithParentData,
} from "@/features/folder-dialog/schema/zod-schema"

/**
 * Folder with nested items count (useful for UI display)
 * Note: Item counts are for future use when items are implemented
 */
export type FolderWithCounts = {
  id: string
  userId: string
  category: DBCategoryType
  name: string
  emoji: string | null
  description: string | null
  order: number
  createdAt: Date
  updatedAt: Date
  notesCount?: number
  journalEntriesCount?: number
  kanbanItemsCount?: number
}

/**
 * Category with folders (full hierarchy)
 */
export type CategoryWithFolders = {
  category: DBCategoryType
  folders: FolderWithCounts[]
}

