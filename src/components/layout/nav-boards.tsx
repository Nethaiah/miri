"use client"

import * as React from "react"
import { MoreHorizontal, Plus, LayoutGrid, Trash2, ArrowUpDown, Hash, Star, Copy, ArrowRightToLine, ExternalLink, PanelRight } from "lucide-react"
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
  DropdownMenuSeparator,
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
    
    // Sort by pinned first, then by selected sort mode
    result.sort((a, b) => {
      // Pinned items always come first
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1
      }
      
      // Then apply secondary sort
      if (sortMode === "alphabetical") {
        return a.name.localeCompare(b.name)
      } else if (sortMode === "last_edited") {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        return timeB - timeA // Most recent first
      }
      return 0
    })
    
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

  const openDeleteDialog = React.useCallback((board: Board) => {
    setBoardToDelete({ id: board.id, name: board.name })
    setDeleteDialogOpen(true)
  }, [])

  const handlePinBoard = React.useCallback(
    async (boardId: string) => {
      try {
        const res = await (client as any).boards[":id"].pin.$patch({ param: { id: boardId } })
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || "Failed to toggle board pin")
        }
        const data = await res.json()
        setBoards((prev) =>
          prev.map((b) => (b.id === boardId ? { ...b, pinned: data.board.pinned } : b))
        )
        toast.success("Board pin status updated")
      } catch (error: any) {
        console.error("Error toggling board pin:", error)
        toast.error(error instanceof Error ? error.message : "Failed to toggle board pin")
      }
    },
    []
  )

  // Track the last favorited board to emit event after state update
  const lastFavoritedBoardRef = React.useRef<{ id: string; favorited: boolean } | null>(null)

  const handleFavoriteBoard = React.useCallback(
    async (boardId: string) => {
      try {
        const res = await (client as any).boards[":id"].favorite.$patch({ param: { id: boardId } })
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || "Failed to toggle board favorite")
        }
        const data = await res.json()
        setBoards((prev) =>
          prev.map((b) => {
            if (b.id === boardId) {
              // Store info to emit event after render
              lastFavoritedBoardRef.current = { id: boardId, favorited: data.board.favorited }
              return { ...b, favorited: data.board.favorited }
            }
            return b
          })
        )
        toast.success("Board favorite status updated")
      } catch (error: any) {
        console.error("Error toggling board favorite:", error)
        toast.error(error instanceof Error ? error.message : "Failed to toggle board favorite")
      }
    },
    []
  )

  // Emit favorite event after state update completes
  React.useEffect(() => {
    if (lastFavoritedBoardRef.current) {
      const { emitFavoriteUpdated } = require("@/lib/favorite-events")
      emitFavoriteUpdated({ 
        type: "board", 
        id: lastFavoritedBoardRef.current.id, 
        favorited: lastFavoritedBoardRef.current.favorited 
      })
      lastFavoritedBoardRef.current = null
    }
  }, [boards])

  const handleCopyLink = React.useCallback(async (url: string) => {
    if (typeof window === "undefined") return
    const fullUrl = `${window.location.origin}${url}`
    try {
      await navigator.clipboard.writeText(fullUrl)
      toast.success("Link copied to clipboard")
    } catch {
      toast.error("Failed to copy link")
    }
  }, [])

  const handleOpenNewTab = React.useCallback((url: string) => {
    if (typeof window === "undefined") return
    window.open(url, "_blank")
  }, [])

  const handleDuplicateBoard = React.useCallback(
    async (boardId: string) => {
      try {
        const res = await (client as any).boards[":id"].duplicate.$post({ param: { id: boardId } })
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || "Failed to duplicate board")
        }
        const data = await res.json()
        const newBoard = data.board as Board
        setBoards((prev) => [newBoard, ...prev])
        router.push(`/board/${newBoard.id}`)
        toast.success("Board duplicated successfully")
      } catch (error: any) {
        console.error("Error duplicating board:", error)
        toast.error(error instanceof Error ? error.message : "Failed to duplicate board")
      }
    },
    [router]
  )

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
        <SidebarMenu className="gap-0">
          {processedBoards.map((board) => (
            <SidebarMenuItem key={board.id} className="relative group/item">
              <SidebarMenuButton
                asChild
                isActive={activeBoardId === board.id}
                tooltip={board.name}
                className="group-hover/item:bg-sidebar-accent group-hover/item:text-sidebar-accent-foreground"
              >
                <Link href={`/board/${board.id}`}>
                  <LayoutGrid className="h-4 w-4" />
                  <span className="truncate">{board.name}</span>
                </Link>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity z-10 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="w-56">
                  <div className="px-2 py-1.5 text-xs text-muted-foreground truncate border-b mb-1">
                    {board.name}
                  </div>

                  <DropdownMenuItem onClick={() => handleFavoriteBoard(board.id)}>
                    <Star className={`mr-2 h-4 w-4 ${board.favorited ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                    {board.favorited ? "Remove from Favorites" : "Add to Favorites"}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => handleCopyLink(`/board/${board.id}`)}>
                    <Copy className="mr-2 h-4 w-4 text-muted-foreground" />
                    Copy link
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => handleDuplicateBoard(board.id)}>
                    <ArrowRightToLine className="mr-2 h-4 w-4 text-muted-foreground" />
                    Duplicate
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => openDeleteDialog(board)}
                    className="text-muted-foreground focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => handleOpenNewTab(`/board/${board.id}`)}>
                    <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />
                    Open in new tab
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => toast("Side peek coming soon")}>
                    <PanelRight className="mr-2 h-4 w-4 text-muted-foreground" />
                    Open in side peek
                  </DropdownMenuItem>

                  {/* Last edited info */}
                  {(board.updatedAt || board.createdAt) && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs text-muted-foreground/70">
                        {board.updatedAt && (
                          <div>Last edited: {new Date(board.updatedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}</div>
                        )}
                        {board.createdAt && (
                          <div>Created: {new Date(board.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}</div>
                        )}
                      </div>
                    </>
                  )}
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
    </>
  )
}
