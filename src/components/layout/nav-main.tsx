"use client"

import { ChevronRight, MoreHorizontal, Plus, Pencil, Trash2, Folder as FolderIcon, FolderOpen, type LucideIcon } from "lucide-react"

import * as React from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarMenuAction,
} from "@/components/ui/sidebar"

import { FolderDialog } from "@/features/folder-dialog/components/folder-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSidebar } from "@/components/ui/sidebar"
import { toast } from "sonner"
import { useNavState } from "@/components/layout/app-sidebar"
import { client } from "@/lib/api-client"
import type { Folder, Note } from "@/db/schema"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    isActive?: boolean
    isFolderable?: boolean
    items?: { title: string; url: string }[]
  }[]
}) {
  const { isMobile } = useSidebar()
  const { openItems, toggleItem } = useNavState()

  // Folders state
  const [folders, setFolders] = React.useState<Folder[]>([])

  // Notes grouped by folder
  const [notesByFolder, setNotesByFolder] = React.useState<Record<string, Note[]>>({})

  // Add folder dialog control
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)

  // Rename modal control
  const [renameDialogOpen, setRenameDialogOpen] = React.useState(false)
  const [editingFolder, setEditingFolder] = React.useState<{
    id: string
    name: string
  } | null>(null)

  // Delete dialog control
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [folderToDelete, setFolderToDelete] = React.useState<{
    id: string
    name: string
  } | null>(null)

  const router = useRouter()

  const fetchNotesForFolders = React.useCallback(
    async (folderIds: string[]) => {
      try {
        const results = await Promise.all(
          folderIds.map(async (folderId) => {
            const res = await (client as any).notes.$get({
              query: { folderId },
            })
            if (!res.ok) {
              const error = await res.json().catch(() => null)
              throw new Error(error?.error || "Failed to load notes")
            }

            const data = await res.json()
            return { folderId, notes: (data.notes as Note[]) || [] }
          })
        )

        setNotesByFolder((prev) => {
          const next = { ...prev }
          for (const { folderId, notes } of results) {
            next[folderId] = notes
          }
          return next
        })
      } catch (error) {
        console.error("Error fetching notes:", error)
        toast.error(error instanceof Error ? error.message : "Failed to load notes")
      }
    },
    []
  )

  // Fetch all folders
  const fetchFolders = React.useCallback(async () => {
    try {
      const res = await (client as any).folders.$get()

      if (!res.ok) {
        throw new Error("Failed to fetch folders")
      }

      const data = await res.json()
      const foldersList = (data.folders as Folder[]) || []
      setFolders(foldersList)
      if (foldersList.length > 0) {
        void fetchNotesForFolders(foldersList.map((f) => f.id))
      }
    } catch (error) {
      console.error("Error fetching folders:", error)
      toast.error("Failed to load folders")
    }
  }, [fetchNotesForFolders])

  // Fetch folders when Folders section is opened
  React.useEffect(() => {
    items.forEach((item) => {
      if (item.isFolderable && openItems.has(item.title)) {
        fetchFolders()
      }
    })
  }, [openItems, items, fetchFolders])

  // Handle folder creation
  const handleFolderCreate = React.useCallback(async (payload: { name: string; emoji?: string; description?: string }) => {
    try {
      const res = await (client as any).folders.$post({ json: payload })
      if (!res.ok) {
        const error = await res.json().catch(() => null)
        throw new Error(error?.error || "Failed to create folder")
      }

      // Refresh folders
      await fetchFolders()
      toast.success(`${payload.name} created`, {
        description: "Folder successfully created!",
      })
      setAddDialogOpen(false)
    } catch (error) {
      throw error // Re-throw to let folder dialog handle the error
    }
  }, [fetchFolders])

  // Handle folder update
  const handleFolderUpdate = React.useCallback(async (payload: { name: string; emoji?: string; description?: string; originalName: string }) => {
    if (!editingFolder) return

    try {
      const res = await (client as any).folders[":id"].$put({
        param: { id: editingFolder.id },
        json: payload,
      })

      if (!res.ok) {
        const contentType = res.headers.get("content-type")
        let errorMessage = "Failed to update folder"
        if (contentType && contentType.includes("application/json")) {
          try {
            const error = await res.json()
            errorMessage = error.error || errorMessage
          } catch {
            // If JSON parsing fails, use default message
          }
        }
        throw new Error(errorMessage)
      }

      // Refresh folders
      await fetchFolders()
      setRenameDialogOpen(false)
      setEditingFolder(null)
    } catch (error) {
      throw error // Re-throw to let folder dialog handle the error
    }
  }, [editingFolder, fetchFolders])

  // Open delete dialog
  const openDeleteDialog = React.useCallback((folderId: string, folderName: string) => {
    setFolderToDelete({ id: folderId, name: folderName })
    setDeleteDialogOpen(true)
  }, [])

  // Handle folder delete confirmation
  const confirmFolderDelete = React.useCallback(async () => {
    if (!folderToDelete) return

    const { id, name } = folderToDelete

    try {
      const res = await (client as any).folders[":id"].$delete({
        param: { id },
      })

      if (!res.ok) {
        const contentType = res.headers.get("content-type")
        let errorMessage = "Failed to delete folder"
        if (contentType && contentType.includes("application/json")) {
          try {
            const error = await res.json()
            errorMessage = error.error || errorMessage
          } catch {
            // If JSON parsing fails, use default message
          }
        }
        throw new Error(errorMessage)
      }

      // Refresh folders
      await fetchFolders()
      toast.success(`"${name}" deleted`, {
        description: "Folder successfully deleted!",
      })
      setDeleteDialogOpen(false)
      setFolderToDelete(null)
    } catch (error) {
      console.error("Error deleting folder:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete folder")
    }
  }, [folderToDelete, fetchFolders])

  const handleCreateNote = React.useCallback(
    async (folderId: string) => {
      try {
        const res = await (client as any).notes.$post({
          json: { folderId },
        })

        if (!res.ok) {
          const error = await res.json().catch(() => null)
          throw new Error(error?.error || "Failed to create note")
        }

        const data = await res.json()
        const createdNote = data.note as Note | undefined
        const noteId = createdNote?.id

        if (!noteId) {
          throw new Error("Invalid note response")
        }

        setNotesByFolder((prev) => {
          const existing = prev[folderId] || []
          return {
            ...prev,
            [folderId]: [createdNote!, ...existing],
          }
        })

        router.push(`/note/${noteId}`)
      } catch (error) {
        console.error("Error creating note:", error)
        toast.error(error instanceof Error ? error.message : "Failed to create note")
      }
    },
    [router]
  )

  const handleDeleteNote = React.useCallback(
    async (folderId: string, noteId: string, noteTitle?: string | null) => {
      try {
        const res = await (client as any).notes[":id"].$delete({
          param: { id: noteId },
        })

        if (!res.ok) {
          const error = await res.json().catch(() => null)
          throw new Error(error?.error || "Failed to delete note")
        }

        setNotesByFolder((prev) => {
          const existing = prev[folderId] || []
          return {
            ...prev,
            [folderId]: existing.filter((n) => n.id !== noteId),
          }
        })

        toast.success(`"${noteTitle || "Note"}" deleted`, {
          description: "Note successfully deleted!",
        })
      } catch (error) {
        console.error("Error deleting note:", error)
        toast.error(error instanceof Error ? error.message : "Failed to delete note")
      }
    },
    []
  )

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Platform</SidebarGroupLabel>
        <SidebarMenu>
          {items.map((item) => {
            const hasSubItems = item.items && item.items.length > 0
            const isOpen = openItems.has(item.title)

            return (
              <Collapsible
                key={item.title}
                open={isOpen}
                onOpenChange={() => toggleItem(item.title)}
              >
                <SidebarMenuItem className="group/menu-item relative">
                  {/* Main clickable item */}
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link href={item.url}>
                      {item.icon && (
                        item.isFolderable ? (
                          isOpen ? <FolderOpen /> : <FolderIcon />
                        ) : (
                          <item.icon />
                        )
                      )}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {/* Actions for Folders item - show on hover */}

                  {item.isFolderable && (
                    <div className="absolute right-1 top-1.5 flex items-center gap-1 opacity-0 group-hover/menu-item:opacity-100 transition-opacity duration-150 z-20">
                      {/* Options Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuAction
                            showOnHover
                            className="relative top-0 right-0 h-5 w-5"
                          >
                            <MoreHorizontal />
                            <span className="sr-only">More</span>
                          </SidebarMenuAction>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="start">
                          <DropdownMenuItem>
                            <span>Folder Settings</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Add Folder Button */}
                      <SidebarMenuAction
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setAddDialogOpen(true)
                        }}
                        className="relative top-0 right-0 h-5 w-5 hover:bg-accent"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="sr-only">Add Folder</span>
                      </SidebarMenuAction>

                      {/* Chevron to expand */}
                      <CollapsibleTrigger asChild>
                        <SidebarMenuAction
                          className="relative top-0 right-0 h-5 w-5 data-[state=open]:rotate-90 transition-transform duration-200"
                        >
                          <ChevronRight />
                          <span className="sr-only">Toggle</span>
                        </SidebarMenuAction>
                      </CollapsibleTrigger>
                    </div>
                  )}
                  {/* Chevron trigger for non-folderable items with subitems */}
                  {!item.isFolderable && hasSubItems && (
                    <CollapsibleTrigger asChild>
                      <SidebarMenuAction
                        className="data-[state=open]:rotate-90 transition-transform duration-200"
                      >
                        <ChevronRight />
                        <span className="sr-only">Toggle</span>
                      </SidebarMenuAction>
                    </CollapsibleTrigger>
                  )}

                  {/* Subitems */}
                  {isOpen && (
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {/* Dynamic folders for Folders item */}
                        {item.isFolderable &&
                          folders.map((folderItem) => (
                            <SidebarMenuSubItem
                              key={folderItem.id}
                              className="group/item"
                            >
                              <SidebarMenuSubButton asChild>
                                <Link href={`${item.url}/${folderItem.id}`}>
                                  <span className="flex items-center gap-2">
                                    {folderItem.color && (
                                      <span
                                        className="h-3 w-3 rounded-sm border border-border"
                                        style={{ backgroundColor: folderItem.color }}
                                      />
                                    )}
                                    <span>{folderItem.name}</span>
                                  </span>
                                </Link>
                              </SidebarMenuSubButton>

                              {/* Hover dropdown + new note button */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <SidebarMenuAction
                                    className="opacity-0 group-hover/item:opacity-100 data-[state=open]:opacity-100 transition-opacity duration-150"
                                  >
                                    <MoreHorizontal />
                                    <span className="sr-only">More</span>
                                  </SidebarMenuAction>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent
                                  className="w-48"
                                  side={isMobile ? "bottom" : "right"}
                                  align={isMobile ? "end" : "start"}
                                >
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingFolder({
                                        id: folderItem.id,
                                        name: folderItem.name,
                                      })
                                      setRenameDialogOpen(true)
                                    }}
                                  >
                                    <Pencil className="text-muted-foreground mr-2 h-4 w-4" />
                                    <span>Rename</span>
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    onClick={() => openDeleteDialog(folderItem.id, folderItem.name)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="text-muted-foreground mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              <SidebarMenuAction
                                className="opacity-0 group-hover/item:opacity-100 transition-opacity duration-150"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  void handleCreateNote(folderItem.id)
                                }}
                              >
                                <Plus className="h-3 w-" />
                                <span className="sr-only">New note</span>
                              </SidebarMenuAction>
                            </SidebarMenuSubItem>
                          ))}
                        {item.isFolderable &&
                          folders.map((folderItem) => (
                            (notesByFolder[folderItem.id] || []).map((noteItem) => (
                              <SidebarMenuSubItem
                                key={noteItem.id}
                                className="group/note pl-6"
                              >
                                <SidebarMenuSubButton asChild>
                                  <Link href={`/note/${noteItem.id}`}>
                                    <span className="text-xs truncate">
                                      {noteItem.title || "New Notes"}
                                    </span>
                                  </Link>
                                </SidebarMenuSubButton>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <SidebarMenuAction
                                      className="opacity-0 group-hover/note:opacity-100 data-[state=open]:opacity-100 transition-opacity duration-150"
                                    >
                                      <MoreHorizontal />
                                      <span className="sr-only">More</span>
                                    </SidebarMenuAction>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    className="w-48"
                                    side={isMobile ? "bottom" : "right"}
                                    align={isMobile ? "end" : "start"}
                                  >
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        router.push(`/note/${noteItem.id}`)
                                      }}
                                    >
                                      <Pencil className="text-muted-foreground mr-2 h-4 w-4" />
                                      <span>Open</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        void handleDeleteNote(
                                          folderItem.id,
                                          noteItem.id,
                                          noteItem.title
                                        )
                                      }}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="text-muted-foreground mr-2 h-4 w-4" />
                                      <span>Delete</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </SidebarMenuSubItem>
                            ))
                          ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  )}
                </SidebarMenuItem>
              </Collapsible>
            )
          })}
        </SidebarMenu>
      </SidebarGroup>

      {/* Add Folder Dialog */}
      <FolderDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onCreate={handleFolderCreate}
      />

      {/* Rename Dialog */}
      {editingFolder && (
        <FolderDialog
          initialData={{
            name: editingFolder.name,
          }}
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          onUpdate={handleFolderUpdate}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{folderToDelete?.name}"</strong>? 
              This action cannot be undone and will permanently delete this folder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmFolderDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}