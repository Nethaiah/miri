"use client"

import * as React from "react"
import { MoreHorizontal, Plus, Hash, ArrowUpDown, Star, FileText, LayoutGrid, Copy, ExternalLink, PanelRight, Trash2, CornerUpRight } from "lucide-react"
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
import { client } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import type { Note } from "@/db/schema"
import { subscribeFavoriteUpdated } from "@/lib/favorite-events"

type FavoriteItem = {
  id: string
  name: string
  type: "note" | "board"
  updatedAt: Date
  createdAt: Date
  folderId?: string
}

export function NavFavorites() {
  const router = useRouter()
  const pathname = usePathname()

  const [favorites, setFavorites] = React.useState<FavoriteItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  // Sort and Show State - with localStorage persistence
  const [sortMode, setSortMode] = React.useState<"alphabetical" | "last_edited">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("favorites-sort-mode")
      if (saved === "alphabetical" || saved === "last_edited") return saved
    }
    return "alphabetical"
  })
  const [showCount, setShowCount] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("favorites-show-count")
      if (saved) return saved
    }
    return "10"
  })

  // Persist sort/show preferences
  React.useEffect(() => {
    localStorage.setItem("favorites-sort-mode", sortMode)
  }, [sortMode])

  React.useEffect(() => {
    localStorage.setItem("favorites-show-count", showCount)
  }, [showCount])

  const fetchFavorites = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await (client as any).favorites.$get()
      if (!res.ok) throw new Error("Failed to fetch favorites")
      const data = await res.json()
      setFavorites((data.favorites as FavoriteItem[]) || [])
    } catch (error) {
      console.error("Error fetching favorites:", error)
      toast.error("Failed to load favorites")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void fetchFavorites()
  }, [fetchFavorites])

  // Subscribe to favorite updates from other components
  React.useEffect(() => {
    const unsubscribe = subscribeFavoriteUpdated(() => {
      void fetchFavorites()
    })

    return () => {
      unsubscribe()
    }
  }, [fetchFavorites])

  // Processed favorites with sorting and limiting
  const processedFavorites = React.useMemo(() => {
    let result = [...favorites]

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
  }, [favorites, sortMode, showCount])

  const activeId = React.useMemo(() => {
    const noteMatch = pathname?.match(/^\/note\/([^/]+)/)
    const boardMatch = pathname?.match(/^\/board\/([^/]+)/)
    return noteMatch?.[1] || boardMatch?.[1]
  }, [pathname])

  // Helper functions
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

  const handleToggleFavorite = React.useCallback(async (item: FavoriteItem) => {
    try {
      const endpoint = item.type === "note" 
        ? (client as any).notes[":id"].favorite 
        : (client as any).boards[":id"].favorite
      
      const res = await endpoint.$patch({ param: { id: item.id } })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to toggle favorite")
      }
      
      // Remove from favorites list since we're unfavoriting
      setFavorites((prev) => prev.filter((f) => f.id !== item.id))
      toast.success(`Removed from favorites`)
    } catch (error) {
      console.error("Error toggling favorite:", error)
      toast.error(error instanceof Error ? error.message : "Failed to toggle favorite")
    }
  }, [])

  const handleTogglePin = React.useCallback(async (item: FavoriteItem) => {
    try {
      const endpoint = item.type === "note" 
        ? (client as any).notes[":id"].pin 
        : (client as any).boards[":id"].pin
      
      const res = await endpoint.$patch({ param: { id: item.id } })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to toggle pin")
      }
      
      toast.success("Pin status updated")
      await fetchFavorites()
    } catch (error) {
      console.error("Error toggling pin:", error)
      toast.error(error instanceof Error ? error.message : "Failed to toggle pin")
    }
  }, [fetchFavorites])



  const handleDelete = React.useCallback(async (item: FavoriteItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return
    
    try {
      const endpoint = item.type === "note" 
        ? (client as any).notes[":id"] 
        : (client as any).boards[":id"]
      
      const res = await endpoint.$delete({ param: { id: item.id } })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to delete")
      }
      
      setFavorites((prev) => prev.filter((f) => f.id !== item.id))
      if (pathname === `/${item.type === "note" ? "note" : "board"}/${item.id}`) {
        router.push("/dashboard")
      }
      toast.success(`${item.type === "note" ? "Note" : "Board"} deleted`)
    } catch (error) {
      console.error("Error deleting:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete")
    }
  }, [pathname, router])

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="flex items-center justify-between pr-2 group/label w-full">
        <span>Favorites</span>
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
        </div>
      </SidebarGroupLabel>
      <SidebarMenu className="gap-0">
        {!isLoading && processedFavorites.length === 0 ? (
          <SidebarMenuItem>
            <SidebarMenuButton className="text-muted-foreground pointer-events-none">
              <Star className="h-4 w-4" />
              <span>No favorites yet</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : (
          processedFavorites.map((item) => (
            <SidebarMenuItem key={`${item.type}-${item.id}`} className="relative group/item">
              <SidebarMenuButton
                asChild
                isActive={activeId === item.id}
                tooltip={item.name}
                className="group-hover/item:bg-sidebar-accent group-hover/item:text-sidebar-accent-foreground"
              >
                <Link href={item.type === "note" ? `/note/${item.id}` : `/board/${item.id}`}>
                  {item.type === "note" ? (
                    <FileText className="h-4 w-4" />
                  ) : (
                    <LayoutGrid className="h-4 w-4" />
                  )}
                  <span className="truncate">{item.name}</span>
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
                    {item.name}
                  </div>

                  <DropdownMenuItem onClick={() => handleToggleFavorite(item)}>
                    <Star className="mr-2 h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>Remove from Favorites</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => handleCopyLink(item.type === "note" ? `/note/${item.id}` : `/board/${item.id}`)}>
                    <Copy className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Copy link</span>
                  </DropdownMenuItem>

                  {item.type === "note" && (
                    <DropdownMenuItem onClick={() => toast("Move to feature coming soon")}>
                      <CornerUpRight className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>Move to</span>
                    </DropdownMenuItem> 
                  )}

                  <DropdownMenuItem
                    onClick={() => handleDelete(item)}
                    className="text-muted-foreground focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => handleOpenNewTab(item.type === "note" ? `/note/${item.id}` : `/board/${item.id}`)}>
                    <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Open in new tab</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => toast("Side peek coming soon")}>
                    <PanelRight className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Open in side peek</span>
                  </DropdownMenuItem>

                  {/* Last edited info */}
                  {(item.updatedAt || item.createdAt) && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs text-muted-foreground/70">
                        {item.updatedAt && (
                          <div>Last edited: {new Date(item.updatedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}</div>
                        )}
                        {item.createdAt && (
                          <div>Created: {new Date(item.createdAt).toLocaleDateString("en-US", {
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
          ))
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
