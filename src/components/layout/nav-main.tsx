"use client"

import { ArrowUpDown, Hash, MoreHorizontal, Plus, type LucideIcon } from "lucide-react"

import * as React from "react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { FolderDialog } from "@/features/folder-dialog/components/folder-dialog"
import { useSidebar } from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu"

import { toast } from "sonner"
import { client } from "@/lib/api-client"
import type { Folder, Note } from "@/db/schema"
import { subscribeNoteUpdated } from "@/lib/note-events"

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
import { useRouter, usePathname } from "next/navigation"
import { FolderTree } from "@/components/layout/nav-main-folder-tree"

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
  const [noteDeleteDialogOpen, setNoteDeleteDialogOpen] = React.useState(false)
  const [noteToDelete, setNoteToDelete] = React.useState<{
    id: string
    folderId: string
    title?: string | null
  } | null>(null)

  const router = useRouter()
  const pathname = usePathname()

  const activeNoteId = React.useMemo(() => {
    const match = pathname?.match(/^\/note\/([^/]+)/)
    return match?.[1]
  }, [pathname])

  const foldersNavItem = React.useMemo(
    () => items.find((item) => item.isFolderable),
    [items]
  )
  const foldersBaseUrl = foldersNavItem?.url ?? "/folders"

  // Sort and Show State
  const [sortMode, setSortMode] = React.useState<"manual" | "last_edited">("manual")
  const [showCount, setShowCount] = React.useState<string>("10")

  // Processed Folders
  const processedFolders = React.useMemo(() => {
    let result = [...folders]
    
    // Sort
    if (sortMode === "last_edited") {
        // Fallback to name sort if updatedAt isn't available in schema yet
        // In a real app, use: (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        result.sort((a, b) => a.name.localeCompare(b.name))
    }
    
    // Limit
    const limit = parseInt(showCount, 10)
    if (!isNaN(limit) && limit > 0) {
        result = result.slice(0, limit)
    }

    return result
  }, [folders, sortMode, showCount])

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

  const fetchFolders = React.useCallback(async () => {
    try {
      const res = await (client as any).folders.$get()
      if (!res.ok) throw new Error("Failed to fetch folders")
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

  React.useEffect(() => {
    void fetchFolders()
  }, [fetchFolders])

  React.useEffect(() => {
    const unsubscribe = subscribeNoteUpdated((payload) => {
      setNotesByFolder((prev) => {
        const next: Record<string, Note[]> = { ...prev }
        let changed = false

        for (const folderId of Object.keys(next)) {
          const notes = next[folderId]
          const index = notes.findIndex((note) => note.id === payload.id)
          if (index !== -1) {
            const updatedNote: Note = {
              ...notes[index],
              title:
                payload.title !== undefined
                  ? payload.title
                  : notes[index].title,
              description:
                payload.description !== undefined
                  ? payload.description
                  : notes[index].description,
              content:
                payload.content !== undefined
                  ? payload.content
                  : notes[index].content,
            }
            next[folderId] = [
              ...notes.slice(0, index),
              updatedNote,
              ...notes.slice(index + 1),
            ]
            changed = true
            break
          }
        }

        return changed ? next : prev
      })
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleFolderCreate = React.useCallback(async (payload: { name: string; emoji?: string; description?: string }) => {
    try {
      const res = await (client as any).folders.$post({ json: payload })
      if (!res.ok) throw new Error("Failed to create folder")
      await fetchFolders()
      toast.success(`${payload.name} created`)
      setAddDialogOpen(false)
    } catch (error) {
      throw error
    }
  }, [fetchFolders])

  const handleFolderUpdate = React.useCallback(async (payload: { name: string; emoji?: string; description?: string; originalName: string }) => {
    if (!editingFolder) return
    try {
      const res = await (client as any).folders[":id"].$put({
        param: { id: editingFolder.id },
        json: payload,
      })
      if (!res.ok) throw new Error("Failed to update folder")
      await fetchFolders()
      setRenameDialogOpen(false)
      setEditingFolder(null)
    } catch (error) {
      throw error
    }
  }, [editingFolder, fetchFolders])

  const openDeleteDialog = React.useCallback((folderId: string, folderName: string) => {
    setFolderToDelete({ id: folderId, name: folderName })
    setDeleteDialogOpen(true)
  }, [])

  const confirmFolderDelete = React.useCallback(async () => {
    if (!folderToDelete) return
    const { id, name } = folderToDelete
    try {
      const res = await (client as any).folders[":id"].$delete({ param: { id } })
      if (!res.ok) throw new Error("Failed to delete folder")
      await fetchFolders()
      toast.success(`"${name}" deleted`)
      setDeleteDialogOpen(false)
      setFolderToDelete(null)
    } catch (error) {
      console.error("Error deleting folder:", error)
      toast.error("Failed to delete folder")
    }
  }, [folderToDelete, fetchFolders])

  const handleCreateNote = React.useCallback(
    async (folderId: string) => {
      try {
        const res = await (client as any).notes.$post({ json: { folderId } })
        if (!res.ok) throw new Error("Failed to create note")
        const data = await res.json()
        const createdNote = data.note as Note | undefined
        if (!createdNote?.id) throw new Error("Invalid note response")

        setNotesByFolder((prev) => {
          const existing = prev[folderId] || []
          return { ...prev, [folderId]: [createdNote!, ...existing] }
        })
        router.push(`/note/${createdNote.id}`)
      } catch (error) {
        console.error("Error creating note:", error)
        toast.error("Failed to create note")
      }
    },
    [router]
  )

  const handleDeleteNote = React.useCallback(
    async (folderId: string, noteId: string, noteTitle?: string | null) => {
      try {
        const res = await (client as any).notes[":id"].$delete({ param: { id: noteId } })
        if (!res.ok) throw new Error("Failed to delete note")
        setNotesByFolder((prev) => {
          const existing = prev[folderId] || []
          return { ...prev, [folderId]: existing.filter((n) => n.id !== noteId) }
        })
        if (pathname === `/note/${noteId}`) router.push("/dashboard")
        toast.success(`"${noteTitle || "Note"}" deleted`)
      } catch (error) {
        console.error("Error deleting note:", error)
        toast.error("Failed to delete note")
      }
    },
    [pathname, router]
  )

  const openNoteDeleteDialog = React.useCallback(
    (folderId: string, noteId: string, noteTitle?: string | null) => {
      setNoteToDelete({ id: noteId, folderId, title: noteTitle })
      setNoteDeleteDialogOpen(true)
    },
    [],
  )

  const confirmNoteDelete = React.useCallback(async () => {
    if (!noteToDelete) return
    const { folderId, id, title } = noteToDelete
    await handleDeleteNote(folderId, id, title)
    setNoteDeleteDialogOpen(false)
    setNoteToDelete(null)
  }, [noteToDelete, handleDeleteNote])

  const handleDuplicateNote = React.useCallback(
    async (folderId: string, sourceNote: Note) => {
      try {
        const res = await (client as any).notes.$post({
          json: {
            folderId,
            title: sourceNote.title ? `${sourceNote.title} (Copy)` : "New Notes",
            description: sourceNote.description ?? undefined,
            content: sourceNote.content ?? "",
          },
        })
        if (!res.ok) throw new Error("Failed to duplicate note")
        const data = await res.json()
        const duplicatedNote = data.note as Note | undefined
        if (!duplicatedNote?.id) throw new Error("Invalid note response")
        setNotesByFolder((prev) => {
          const existing = prev[folderId] || []
          return { ...prev, [folderId]: [duplicatedNote!, ...existing] }
        })
        router.push(`/note/${duplicatedNote.id}`)
        toast.success("Note duplicated")
      } catch (error) {
        console.error("Error duplicating note:", error)
        toast.error("Failed to duplicate note")
      }
    },
    [router]
  )

  const platformItems = React.useMemo(
    () => items.filter((item) => !item.isFolderable),
    [items]
  )

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Platform</SidebarGroupLabel>
        <SidebarMenu>
          {platformItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title}>
                <Link href={item.url}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel className="flex items-center justify-between pr-2 group/label w-full">
          <span>Private</span>
          <div className="flex items-center opacity-0 group-hover/label:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="bottom" className="w-56">
                
                {/* SORT SUBMENU */}
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">Sort</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                            {sortMode === "manual" ? "Manual" : "Last edited"}
                        </span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-48">
                        <DropdownMenuRadioGroup
                            value={sortMode}
                            onValueChange={(value) => setSortMode(value as any)}
                        >
                            <DropdownMenuRadioItem value="manual">Manual</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="last_edited">Last edited</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* SHOW SUBMENU */}
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Hash className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">Show</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                            {showCount} items
                        </span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-48">
                        <DropdownMenuRadioGroup
                            value={showCount}
                            onValueChange={setShowCount}
                        >
                            <DropdownMenuRadioItem value="5">5 items</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="10">10 items</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="15">15 items</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="20">20 items</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="100">100 items</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

              </DropdownMenuContent>
            </DropdownMenu>
            
            <button
              type="button"
              onClick={() => setAddDialogOpen(true)}
              className="flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ml-0.5"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </SidebarGroupLabel>
        <SidebarMenu>
          <FolderTree
            baseUrl={foldersBaseUrl}
            folders={processedFolders}
            notesByFolder={notesByFolder}
            isMobile={isMobile}
            onRenameFolder={(folder) => {
              setEditingFolder(folder)
              setRenameDialogOpen(true)
            }}
            onDeleteFolder={openDeleteDialog}
            onCreateNote={(folderId) => void handleCreateNote(folderId)}
            onOpenNote={(noteId) => router.push(`/note/${noteId}`)}
            onDeleteNote={openNoteDeleteDialog}
            onDuplicateNote={(folderId, note) => void handleDuplicateNote(folderId, note)}
            activeNoteId={activeNoteId}
          />
        </SidebarMenu>
      </SidebarGroup>

      {/* Dialogs remain the same */}
      <FolderDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onCreate={handleFolderCreate}
      />

      {editingFolder && (
        <FolderDialog
          initialData={{ name: editingFolder.name }}
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          onUpdate={handleFolderUpdate}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{folderToDelete?.name}"</strong>? 
              This will also delete all notes inside it.
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

      <AlertDialog open={noteDeleteDialogOpen} onOpenChange={setNoteDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete
              {" "}
              <strong>
                "{noteToDelete?.title || "Untitled"}"
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmNoteDelete}
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