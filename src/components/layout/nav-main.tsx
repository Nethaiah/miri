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

  // rename modal control
  const [renameDialogOpen, setRenameDialogOpen] = React.useState(false)
  const [editingFolder, setEditingFolder] = React.useState<{
    name: string
    parent: "Notes" | "Journal" | "Kanban"
  } | null>(null)

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Platform</SidebarGroupLabel>
        <SidebarMenu>
          {items.map((item) => {
            const hasSubItems = item.items && item.items.length > 0
            const isFolderable = ["Notes", "Journal", "Kanban"].includes(item.title)

            return (
              <Collapsible key={item.title} defaultOpen={item.isActive}>
                <SidebarMenuItem>
                  {/* Main clickable item */}
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <a href={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>

                  {/* Chevron trigger */}
                  {hasSubItems && (
                    <CollapsibleTrigger asChild>
                      <SidebarMenuAction className="data-[state=open]:rotate-90 transition-transform duration-200">
                        <ChevronRight />
                        <span className="sr-only">Toggle</span>
                      </SidebarMenuAction>
                    </CollapsibleTrigger>
                  )}

                  {/* Subitems */}
                  {hasSubItems && (
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {/* + New Folder Button */}
                        {isFolderable && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild>
                              <div className="w-full">
                                <FolderButton parent={item.title as any} />
                              </div>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}

                        {/* Sub-item folders */}
                        {item.items?.map((subItem) => (
                          <SidebarMenuSubItem
                            key={subItem.title}
                            className="group/item"
                          >
                            <SidebarMenuSubButton asChild>
                              <a href={subItem.url}>
                                <span>{subItem.title}</span>
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
                                      name: subItem.title,
                                      parent: item.title as any,
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
                                    toast.warning(
                                      `Deleting "${subItem.title}" (confirm later)`
                                    )
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
          onUpdate={(data) => {
            toast.success(`Renamed to "${data.name}"`)
            setRenameDialogOpen(false)
            setEditingFolder(null)
          }}
        />
      )}
    </>
  )
}
