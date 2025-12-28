"use client"

import * as React from "react"
import Link from "next/link"
import {
  ChevronRight,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Folder,
  FolderOpen,
  Star,
  Copy,
  ArrowRightToLine,
  ExternalLink,
  CornerUpRight,
  PanelRight,
  ArrowUpDown,
  Hash
} from "lucide-react"

import type { Folder as FolderType, Note } from "@/db/schema"
import { SidebarMenuItem } from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type FolderTreeProps = {
  baseUrl: string
  folders: FolderType[]
  notesByFolder: Record<string, Note[]>
  isMobile: boolean
  onRenameFolder: (folder: { id: string; name: string }) => void
  onDeleteFolder: (folderId: string, folderName: string) => void
  onCreateNote: (folderId: string) => void
  onOpenNote: (noteId: string) => void
  onDeleteNote: (folderId: string, noteId: string, title?: string | null) => void
  onDuplicateNote: (folderId: string, note: Note) => void
  onPinFolder: (folderId: string) => void
  onPinNote: (noteId: string) => void
  onFavoriteNote: (noteId: string) => void
  activeNoteId?: string
}

export function FolderTree({
  baseUrl,
  folders,
  notesByFolder,
  isMobile,
  onRenameFolder,
  onDeleteFolder,
  onCreateNote,
  onOpenNote,
  onDeleteNote,
  onDuplicateNote,
  onPinFolder,
  onPinNote,
  onFavoriteNote,
  activeNoteId,
}: FolderTreeProps) {
  const [openFolders, setOpenFolders] = React.useState<Set<string>>(
    () => new Set()
  )

  const toggleFolderOpen = React.useCallback((folderId: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }, [])

  // Helper to copy link
  const handleCopyLink = async (url: string) => {
    if (typeof window === "undefined") return
    const fullUrl = `${window.location.origin}${url}`
    try {
      await navigator.clipboard.writeText(fullUrl)
      toast.success("Link copied to clipboard")
    } catch {
      toast.error("Failed to copy link")
    }
  }

  // Helper to open in new tab
  const handleOpenNewTab = (url: string) => {
    if (typeof window === "undefined") return
    window.open(url, "_blank")
  }

  return (
    <>
      {folders.map((folderItem) => {
        const isFolderOpen = openFolders.has(folderItem.id)
        const folderNotes = notesByFolder[folderItem.id] || []

        return (
          <SidebarMenuItem key={folderItem.id}>
            <div className="w-full">
              {/* Folder Row */}
              <div 
                className={cn(
                  "group/row flex items-center gap-1 rounded-sm py-1 px-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer select-none",
                )}
                onClick={(e) => {
                    toggleFolderOpen(folderItem.id)
                }}
              >
                {/* Chevron Toggle */}
                <div className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground/80 transition-transform duration-200">
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      isFolderOpen && "rotate-90"
                    )}
                  />
                </div>

                {/* Folder Icon */}
                <div className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground">
                    {isFolderOpen ? (
                        <FolderOpen className="h-4 w-4" />
                    ) : (
                        <Folder className="h-4 w-4" />
                    )}
                </div>

                {/* Folder Name */}
                <span className="flex-1 truncate font-medium text-sidebar-foreground">
                    {folderItem.name}
                </span>

                {/* Action Buttons (Visible on Hover) */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                }}
                                className="flex h-5 w-5 items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-muted-foreground"
                            >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                        </DropdownMenuTrigger>
                        <ActionMenuContent 
                            type="folder"
                            title={folderItem.name}
                            item={folderItem}
                            onPin={() => onPinFolder(folderItem.id)}
                            onRename={() => onRenameFolder({ id: folderItem.id, name: folderItem.name })}
                            onDelete={() => onDeleteFolder(folderItem.id, folderItem.name)}
                            isMobile={isMobile}
                        />
                    </DropdownMenu>

                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onCreateNote(folderItem.id)
                        }}
                        className="flex h-5 w-5 items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-muted-foreground"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                </div>
              </div>

              {/* Children (Notes) */}
              {isFolderOpen && (
                <div className="relative">
                  {folderNotes.length === 0 ? (
                    <div className="flex items-center gap-2 py-1 pl-[42px] pr-2 text-sm text-muted-foreground/50 select-none">
                      <span>No pages inside</span>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                        {folderNotes.map((noteItem) => (
                            <div
                            key={noteItem.id}
                            onClick={() => onOpenNote(noteItem.id)}
                            className={cn(
                                "group/note-row flex items-center gap-1 rounded-sm py-1 pl-[42px] pr-2 text-sm transition-colors cursor-pointer min-h-[28px]",
                                activeNoteId === noteItem.id 
                                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                                : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-muted-foreground"
                            )}
                            >
                                <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                                    <FileText className="h-4 w-4 opacity-70" />
                                </div>
        
                                <span className="flex-1 truncate">
                                    {noteItem.title || "Untitled"}
                                </span>
        
                                <div className="flex items-center gap-0.5 opacity-0 group-hover/note-row:opacity-100 transition-opacity">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                }}
                                                className="flex h-5 w-5 items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                            >
                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <ActionMenuContent 
                                            type="note"
                                            title={noteItem.title || "Untitled"}
                                            item={noteItem}
                                            onCopyLink={() => handleCopyLink(`/note/${noteItem.id}`)}
                                            onOpenNewTab={() => handleOpenNewTab(`/note/${noteItem.id}`)}
                                            onPin={() => onPinNote(noteItem.id)}
                                            onFavorite={() => onFavoriteNote(noteItem.id)}
                                            onDuplicate={() => onDuplicateNote(folderItem.id, noteItem)}
                                            onDelete={() => onDeleteNote(folderItem.id, noteItem.id, noteItem.title)}
                                            isMobile={isMobile}
                                        />
                                    </DropdownMenu>
                                </div>
                            </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </SidebarMenuItem>
        )
      })}
    </>
  )
}

function ActionMenuContent({ 
    type, 
    title,
    item,
    onCopyLink,
    onOpenNewTab,
    onPin,
    onFavorite,
    onRename,
    onDuplicate,
    onDelete,
    isMobile
}: { 
    type: "folder" | "note",
    title: string,
    item: any, // FolderType | Note
    onCopyLink?: () => void,
    onOpenNewTab?: () => void,
    onPin: () => void,
    onFavorite?: () => void,
    onRename?: () => void,
    onDuplicate?: () => void,
    onDelete: () => void,
    isMobile: boolean
}) {
    return (
        <DropdownMenuContent
            className="w-56"
            side={isMobile ? "bottom" : "right"}
            align={isMobile ? "end" : "start"}
            alignOffset={-4}
            onClick={(e) => {
                e.stopPropagation()
            }}
        >
            <div className="px-2 py-1.5 text-xs text-muted-foreground truncate border-b mb-1">
                {title}
            </div>
            
            <DropdownMenuItem onClick={onPin}>
                <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{item?.pinned ? "Unpin" : "Pin"}</span>
            </DropdownMenuItem>

            {type === "note" && onFavorite && (
                <DropdownMenuItem onClick={onFavorite}>
                    <Star className={`mr-2 h-4 w-4 ${item?.favorited ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                    <span>{item?.favorited ? "Remove from Favorites" : "Add to Favorites"}</span>
                </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            {type === "note" && onCopyLink && (
                <DropdownMenuItem onClick={onCopyLink}>
                    <Copy className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Copy link</span>
                </DropdownMenuItem>
            )}

            {type === "note" && onDuplicate && (
                <DropdownMenuItem onClick={onDuplicate}>
                    <ArrowRightToLine className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Duplicate</span>
                </DropdownMenuItem>
            )}

            {type === "folder" && onRename && (
                <DropdownMenuItem onClick={onRename}>
                    <Pencil className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Rename</span>
                </DropdownMenuItem>
            )}

            {type === "note" && (
                <DropdownMenuItem onClick={() => toast("Move to feature coming soon")}>
                    <CornerUpRight className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Move to</span>
                </DropdownMenuItem>
            )}

            <DropdownMenuItem 
                onClick={onDelete}
                className="text-muted-foreground focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
            >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
            </DropdownMenuItem>

            {type === "note" && onOpenNewTab && (
                <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onOpenNewTab}>
                        <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>Open in new tab</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast("Side peek coming soon")}>
                        <PanelRight className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>Open in side peek</span>
                    </DropdownMenuItem>
                </>
            )}
            
        </DropdownMenuContent>
    )
}