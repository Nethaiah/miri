"use client"

import * as React from "react"
import { MoreHorizontal, Plus, LayoutGrid, Trash2, Pencil, ArrowUpDown, Hash } from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
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
import { Input } from "@/components/ui/input"
import { client } from "@/lib/api-client"
import type { Board } from "@/db/schema"
import { subscribeBoardUpdated } from "@/lib/board-events"

export function NavBoards() {
  const router = useRouter()
  const pathname = usePathname()
  
  const [boards, setBoards] = React.useState<Board[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  
  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [boardToDelete, setBoardToDelete] = React.useState<{ id: string; name: string } | null>(null)
  
  // Rename dialog
  const [renameDialogOpen, setRenameDialogOpen] = React.useState(false)
  const [boardToRename, setBoardToRename] = React.useState<{ id: string; name: string } | null>(null)
  const [newName, setNewName] = React.useState("")

  const activeBoardId = React.useMemo(() => {
    const match = pathname?.match(/^\/board\/([^/]+)/)
    return match?.[1]
  }, [pathname])

  const fetchBoards = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await (client as any).boards.$get()
      if (!res.ok) throw new Error("Failed to fetch boards")
      const data = await res.json()
      setBoards((data.boards as Board[]) || [])
    } catch (error) {
      console.error("Error fetching boards:", error)
      toast.error("Failed to load boards")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Sort and Show State - with localStorage persistence
  const [sortMode, setSortMode] = React.useState<"alphabetical" | "last_edited">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("boards-sort-mode")
      if (saved === "alphabetical" || saved === "last_edited") return saved
    }
    return "alphabetical"
  })
  const [showCount, setShowCount] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("boards-show-count")
      if (saved) return saved
    }
    return "10"
  })

  // Persist sort/show preferences to localStorage
  React.useEffect(() => {
    localStorage.setItem("boards-sort-mode", sortMode)
  }, [sortMode])

  React.useEffect(() => {
    localStorage.setItem("boards-show-count", showCount)
  }, [showCount])

  // Processed Boards with sorting and limiting
  const processedBoards = React.useMemo(() => {
    let result = [...boards]
    
    // Sort
    if (sortMode === "alphabetical") {
      result.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortMode === "last_edited") {
      result.sort((a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        return timeB - timeA // Most recent first
      })
    }
    
    // Limit
    const limit = parseInt(showCount, 10)
    if (!isNaN(limit) && limit > 0) {
      result = result.slice(0, limit)
    }

    return result
  }, [boards, sortMode, showCount])

  React.useEffect(() => {
    void fetchBoards()
  }, [fetchBoards])

  // Subscribe to board updates from the editor
  React.useEffect(() => {
    const unsubscribe = subscribeBoardUpdated((payload) => {
      setBoards((prev) =>
        prev.map((board) =>
          board.id === payload.id
            ? {
                ...board,
                name: payload.name !== undefined ? payload.name : board.name,
                description: payload.description !== undefined ? payload.description : board.description,
                updatedAt: payload.updatedAt !== undefined ? payload.updatedAt : board.updatedAt,
              }
            : board
        )
      )
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleCreateBoard = React.useCallback(async () => {
    try {
      const res = await (client as any).boards.$post({ json: {} })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to create board")
      }
      const data = await res.json()
      const newBoard = data.board as Board
      setBoards((prev) => [newBoard, ...prev])
      router.push(`/board/${newBoard.id}`)
    } catch (error) {
      console.error("Error creating board:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create board")
    }
  }, [router])

  const handleDeleteBoard = React.useCallback(async () => {
    if (!boardToDelete) return
    try {
      const res = await (client as any).boards[":id"].$delete({ param: { id: boardToDelete.id } })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to delete board")
      }
      setBoards((prev) => prev.filter((b) => b.id !== boardToDelete.id))
      if (pathname === `/board/${boardToDelete.id}`) {
        router.push("/dashboard")
      }
      toast.success(`Board "${boardToDelete.name}" deleted`)
      setDeleteDialogOpen(false)
      setBoardToDelete(null)
    } catch (error) {
      console.error("Error deleting board:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete board")
    }
  }, [boardToDelete, pathname, router])

  const handleRenameBoard = React.useCallback(async () => {
    if (!boardToRename || !newName.trim()) return
    try {
      const res = await (client as any).boards[":id"].$put({
        param: { id: boardToRename.id },
        json: { name: newName.trim() },
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to rename board")
      }
      setBoards((prev) =>
        prev.map((b) => (b.id === boardToRename.id ? { ...b, name: newName.trim() } : b))
      )
      toast.success(`Board renamed to "${newName.trim()}"`)
      setRenameDialogOpen(false)
      setBoardToRename(null)
      setNewName("")
    } catch (error) {
      console.error("Error renaming board:", error)
      toast.error(error instanceof Error ? error.message : "Failed to rename board")
    }
  }, [boardToRename, newName])

  const openDeleteDialog = React.useCallback((board: Board) => {
    setBoardToDelete({ id: board.id, name: board.name })
    setDeleteDialogOpen(true)
  }, [])

  const openRenameDialog = React.useCallback((board: Board) => {
    setBoardToRename({ id: board.id, name: board.name })
    setNewName(board.name)
    setRenameDialogOpen(true)
  }, [])

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel className="flex items-center justify-between pr-2 group/label w-full">
          <span>Boards</span>
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
                      {sortMode === "alphabetical" ? "Alphabetical" : "Last edited"}
                    </span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48">
                    <DropdownMenuRadioGroup
                      value={sortMode}
                      onValueChange={(value) => setSortMode(value as any)}
                    >
                      <DropdownMenuRadioItem value="alphabetical">Alphabetical</DropdownMenuRadioItem>
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
              onClick={handleCreateBoard}
              className="flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ml-0.5"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </SidebarGroupLabel>
        <SidebarMenu>
          {processedBoards.map((board) => (
            <SidebarMenuItem key={board.id}>
              <SidebarMenuButton
                asChild
                isActive={activeBoardId === board.id}
                tooltip={board.name}
              >
                <Link href={`/board/${board.id}`}>
                  <LayoutGrid className="h-4 w-4" />
                  <span className="truncate">{board.name}</span>
                </Link>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover>
                    <MoreHorizontal className="h-4 w-4" />
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start">
                  <DropdownMenuItem onClick={() => openRenameDialog(board)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openDeleteDialog(board)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ))}
          {!isLoading && boards.length === 0 && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleCreateBoard}
                className="text-muted-foreground"
              >
                <Plus className="h-4 w-4" />
                <span>Create your first board</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarGroup>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Board</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{boardToDelete?.name}"</strong>?
              This will delete all columns and cards in this board.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBoard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <AlertDialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename Board</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a new name for this board.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Board name"
            className="mt-2"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleRenameBoard()
              }
            }}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRenameBoard}>
              Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
