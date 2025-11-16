"use client"

import { ChevronRight, MoreHorizontal, Pencil, Trash2, type LucideIcon } from "lucide-react"
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

import { FolderButton } from "@/features/folder-dialog/components/add-folder"
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
import type { CategoryType } from "@/features/folder-dialog/schema/zod-schema"
import { client } from "@/lib/api-client"
import type { Folder } from "@/db/schema"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    isActive?: boolean
    items?: { title: string; url: string }[]
  }[]
}) {
  const { isMobile } = useSidebar()
  const { openItems, toggleItem } = useNavState()

  // Folders state organized by category
  const [foldersByCategory, setFoldersByCategory] = React.useState<Record<CategoryType, Folder[]>>({
    Notes: [],
    Journals: [],
    Kanbans: [],
  })

  // rename modal control
  const [renameDialogOpen, setRenameDialogOpen] = React.useState(false)
  const [editingFolder, setEditingFolder] = React.useState<{
    id: string
    name: string
    parent: CategoryType
  } | null>(null)

  // Fetch folders for a specific category
  const fetchFolders = React.useCallback(async (category: CategoryType) => {
    try {
      const res = await (client as any).folders.$get({
        query: { category },
      })
      
      if (!res.ok) {
        throw new Error("Failed to fetch folders")
      }
      
      const data = await res.json()
      setFoldersByCategory((prev) => ({
        ...prev,
        [category]: data.folders || [],
      }))
    } catch (error) {
      console.error("Error fetching folders:", error)
      toast.error("Failed to load folders")
    }
  }, [])

  // Fetch folders when category is opened
  React.useEffect(() => {
    items.forEach((item) => {
      if (["Notes", "Journals", "Kanbans"].includes(item.title) && openItems.has(item.title)) {
        fetchFolders(item.title as CategoryType)
      }
    })
  }, [openItems, items, fetchFolders])

  // Handle folder creation
  const handleFolderCreate = React.useCallback(async (payload: { name: string; emoji?: string; description?: string; parent: CategoryType }) => {
    try {
      const res = await (client as any).folders.$post({ json: payload })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to create folder")
      }
      
      // Refresh folders for that category
      await fetchFolders(payload.parent)
      toast.success(`${payload.name} created`, {
        description: "Folder successfully created!",
      })
    } catch (error) {
      throw error // Re-throw to let folder dialog handle the error
    }
  }, [fetchFolders])

  // Handle folder update
  const handleFolderUpdate = React.useCallback(async (payload: { name: string; emoji?: string; description?: string; parent: CategoryType; originalName: string }) => {
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
      
      // Refresh folders for that category
      await fetchFolders(payload.parent)
      toast.success(`Renamed to "${payload.name}"`)
      setRenameDialogOpen(false)
      setEditingFolder(null)
    } catch (error) {
      throw error // Re-throw to let folder dialog handle the error
    }
  }, [editingFolder, fetchFolders])

  // Handle folder delete
  const handleFolderDelete = React.useCallback(async (folderId: string, category: CategoryType, folderName: string) => {
    if (!confirm(`Are you sure you want to delete "${folderName}"? This will also delete all items inside it.`)) {
      return
    }

    try {
      const res = await (client as any).folders[":id"].$delete({
        param: { id: folderId },
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
      
      // Refresh folders for that category
      await fetchFolders(category)
      toast.success(`"${folderName}" deleted`)
    } catch (error) {
      console.error("Error deleting folder:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete folder")
    }
  }, [fetchFolders])

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Platform</SidebarGroupLabel>
        <SidebarMenu>
          {items.map((item) => {
            const hasSubItems = item.items && item.items.length > 0
            const isFolderable = ["Notes", "Journals", "Kanbans"].includes(item.title)
            const isOpen = openItems.has(item.title)

            return (
              <Collapsible 
                key={item.title} 
                open={isOpen}
                onOpenChange={() => toggleItem(item.title)}
              >
                <SidebarMenuItem>
                  {/* Main clickable item */}
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <a href={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>

                  {/* Chevron trigger - show for folderable categories or items with sub-items */}
                  {(hasSubItems || isFolderable) && (
                    <CollapsibleTrigger asChild>
                      <SidebarMenuAction className="data-[state=open]:rotate-90 transition-transform duration-200">
                        <ChevronRight />
                        <span className="sr-only">Toggle</span>
                      </SidebarMenuAction>
                    </CollapsibleTrigger>
                  )}

                  {/* Subitems */}
                  {isOpen && (
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {/* + New Folder Button - only for folderable categories */}
                        {isFolderable && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild>
                              <div className="w-full">
                                <FolderDialog 
                                  parent={item.title as CategoryType}
                                  onCreate={handleFolderCreate}
                                />
                              </div>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}

                        {/* Dynamic folders from API */}
                        {isFolderable && foldersByCategory[item.title as CategoryType]?.map((folderItem) => (
                          <SidebarMenuSubItem
                            key={folderItem.id}
                            className="group/item"
                          >
                            <SidebarMenuSubButton asChild>
                              <a href={`${item.url}/${folderItem.id}`}>
                                <span>{folderItem.name}</span>
                              </a>
                            </SidebarMenuSubButton>

                            {/* Hover dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <SidebarMenuAction className="opacity-0 group-hover/item:opacity-100 data-[state=open]:opacity-100 transition-opacity duration-150">
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
                                      parent: item.title as CategoryType,
                                    })
                                    setRenameDialogOpen(true)
                                  }}
                                >
                                  <Pencil className="text-muted-foreground mr-2 h-4 w-4" />
                                  <span>Rename</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() =>
                                    handleFolderDelete(folderItem.id, item.title as CategoryType, folderItem.name)
                                  }
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="text-muted-foreground mr-2 h-4 w-4" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </SidebarMenuSubItem>
                        ))}

                        {/* Fallback: Show hardcoded items for non-folderable categories */}
                        {!isFolderable && item.items?.map((subItem) => (
                          <SidebarMenuSubItem
                            key={subItem.title}
                            className="group/item"
                          >
                            <SidebarMenuSubButton asChild>
                              <a href={subItem.url}>
                                <span>{subItem.title}</span>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
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

      {/* 🪄 Rename Dialog */}
      {editingFolder && (
        <FolderDialog
          parent={editingFolder.parent}
          initialData={{
            name: editingFolder.name,
            parent: editingFolder.parent,
          }}
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          onUpdate={handleFolderUpdate}
        />
      )}
    </>
  )
}