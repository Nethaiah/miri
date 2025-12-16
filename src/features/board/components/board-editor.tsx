"use client"

import { useCallback, useEffect, useState } from "react"
import { client } from "@/lib/api-client"
import { toast } from "sonner"
import TextareaAutosize from "react-textarea-autosize"
import { Plus, MoreHorizontal, Trash2, Pencil, Calendar as CalendarIcon, X } from "lucide-react"
import { format } from "date-fns"
import {
  KanbanProvider,
  KanbanBoard,
  KanbanHeader,
  KanbanCards,
  KanbanCard,
  type DragEndEvent,
} from "@/components/kibo-ui/kanban"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import type { KanbanColumn, KanbanCard as KanbanCardType } from "@/db/schema"
import { emitBoardUpdated } from "@/lib/board-events"
import { cn } from "@/lib/utils"

type BoardEditorProps = {
  id: string
  name: string
  description: string | null
  initialColumns: KanbanColumn[]
  initialCards: KanbanCardType[]
}

// Transform cards to match Kibo Kanban format
type KanbanItem = {
  id: string
  name: string
  column: string
  description?: string | null
  dueDate?: Date | null
  order: number
}

type KanbanColumnItem = {
  id: string
  name: string
  color?: string | null
  order: number
}

// Column status colors
const COLUMN_COLORS: Record<string, string> = {
  "Todo": "#94a3b8",      // slate
  "In Progress": "#f59e0b", // amber
  "Done": "#22c55e",      // green
  "Backlog": "#6b7280",   // gray
  "Review": "#8b5cf6",    // violet
}

function getColumnColor(name: string, customColor?: string | null): string {
  if (customColor) return customColor
  return COLUMN_COLORS[name] || "#94a3b8"
}

export function BoardEditor({ 
  id, 
  name, 
  description, 
  initialColumns, 
  initialCards 
}: BoardEditorProps) {
  const [draftName, setDraftName] = useState(name || "")
  const [draftDescription, setDraftDescription] = useState(description || "")
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Kanban state
  const [columns, setColumns] = useState<KanbanColumnItem[]>(
    initialColumns.map((c) => ({ id: c.id, name: c.name, color: c.color, order: c.order }))
  )
  const [cards, setCards] = useState<KanbanItem[]>(
    initialCards.map((c) => ({
      id: c.id,
      name: c.name,
      column: c.columnId,
      description: c.description,
      dueDate: c.dueDate,
      order: c.order,
    }))
  )

  // Add card dialog
  const [addCardDialogOpen, setAddCardDialogOpen] = useState(false)
  const [addCardColumnId, setAddCardColumnId] = useState<string | null>(null)
  const [newCardName, setNewCardName] = useState("")
  const [newCardDescription, setNewCardDescription] = useState("")
  const [newCardDueDate, setNewCardDueDate] = useState<Date | undefined>()

  // Edit card dialog
  const [editCardDialogOpen, setEditCardDialogOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<KanbanItem | null>(null)
  const [editCardName, setEditCardName] = useState("")
  const [editCardDescription, setEditCardDescription] = useState("")
  const [editCardDueDate, setEditCardDueDate] = useState<Date | undefined>()

  // Add column dialog
  const [addColumnDialogOpen, setAddColumnDialogOpen] = useState(false)
  const [newColumnName, setNewColumnName] = useState("")

  // Rename column dialog
  const [renameColumnDialogOpen, setRenameColumnDialogOpen] = useState(false)
  const [columnToRename, setColumnToRename] = useState<{ id: string; name: string } | null>(null)
  const [renameColumnName, setRenameColumnName] = useState("")

  // Delete card confirmation
  const [deleteCardDialogOpen, setDeleteCardDialogOpen] = useState(false)
  const [cardToDelete, setCardToDelete] = useState<KanbanItem | null>(null)

  // View card detail
  const [viewCardDialogOpen, setViewCardDialogOpen] = useState(false)
  const [viewingCard, setViewingCard] = useState<KanbanItem | null>(null)

  // Track last saved state
  const [lastSaved, setLastSaved] = useState({ name: name || "", description: description || "" })

  useEffect(() => {
    setHasChanges(draftName !== lastSaved.name || draftDescription !== lastSaved.description)
  }, [draftName, draftDescription, lastSaved])

  // Auto-save board name/description
  const saveBoard = useCallback(async () => {
    if (!hasChanges) return

    try {
      setIsSaving(true)
      const res = await (client as any).boards[":id"].$put({
        param: { id },
        json: {
          name: draftName || "Untitled",
          description: draftDescription || null,
        },
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to save board")
      }

      // Emit event for sidebar to update
      emitBoardUpdated({
        id,
        name: draftName || "Untitled",
        description: draftDescription || null,
      })

      setLastSaved({ name: draftName, description: draftDescription })
    } catch (error) {
      console.error("Auto-save board error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save board")
    } finally {
      setIsSaving(false)
    }
  }, [id, draftName, draftDescription, hasChanges])

  useEffect(() => {
    if (!hasChanges) return
    const timeout = setTimeout(() => {
      void saveBoard()
    }, 1000)
    return () => clearTimeout(timeout)
  }, [hasChanges, saveBoard])

  // Handle card drag end
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      try {
        const cardUpdates = cards.map((card, index) => ({
          id: card.id,
          columnId: card.column,
          order: index,
        }))

        await (client as any).cards["reorder"].$put({
          json: { cards: cardUpdates },
        })
      } catch (error) {
        console.error("Failed to save card order:", error)
        toast.error("Failed to save changes")
      }
    },
    [cards]
  )

  // Add new card
  const handleAddCard = useCallback(async () => {
    if (!addCardColumnId || !newCardName.trim()) return

    try {
      const res = await (client as any).cards.$post({
        json: {
          columnId: addCardColumnId,
          name: newCardName.trim(),
          description: newCardDescription.trim() || null,
          dueDate: newCardDueDate ? newCardDueDate.toISOString() : null,
        },
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to add card")
      }

      const data = await res.json()
      const newCard = data.card as KanbanCardType

      setCards((prev) => [
        ...prev,
        {
          id: newCard.id,
          name: newCard.name,
          column: newCard.columnId,
          description: newCard.description,
          dueDate: newCard.dueDate,
          order: newCard.order,
        },
      ])

      setAddCardDialogOpen(false)
      setNewCardName("")
      setNewCardDescription("")
      setNewCardDueDate(undefined)
      setAddCardColumnId(null)
    } catch (error) {
      console.error("Error adding card:", error)
      toast.error(error instanceof Error ? error.message : "Failed to add card")
    }
  }, [addCardColumnId, newCardName, newCardDescription, newCardDueDate])

  // Open edit card dialog
  const openEditCardDialog = useCallback((card: KanbanItem) => {
    setEditingCard(card)
    setEditCardName(card.name)
    setEditCardDescription(card.description || "")
    setEditCardDueDate(card.dueDate ? new Date(card.dueDate) : undefined)
    setEditCardDialogOpen(true)
  }, [])

  // Save card edits
  const handleSaveCard = useCallback(async () => {
    if (!editingCard || !editCardName.trim()) return

    try {
      const res = await (client as any).cards[":id"].$put({
        param: { id: editingCard.id },
        json: {
          name: editCardName.trim(),
          description: editCardDescription.trim() || null,
          dueDate: editCardDueDate ? editCardDueDate.toISOString() : null,
        },
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to update card")
      }

      setCards((prev) =>
        prev.map((c) =>
          c.id === editingCard.id
            ? {
                ...c,
                name: editCardName.trim(),
                description: editCardDescription.trim() || null,
                dueDate: editCardDueDate || null,
              }
            : c
        )
      )

      setEditCardDialogOpen(false)
      setEditingCard(null)
      toast.success("Card updated")
    } catch (error) {
      console.error("Error updating card:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update card")
    }
  }, [editingCard, editCardName, editCardDescription, editCardDueDate])

  // Delete card
  const confirmDeleteCard = useCallback(async () => {
    if (!cardToDelete) return
    try {
      const res = await (client as any).cards[":id"].$delete({
        param: { id: cardToDelete.id },
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to delete card")
      }

      setCards((prev) => prev.filter((c) => c.id !== cardToDelete.id))
      toast.success("Card deleted")
    } catch (error) {
      console.error("Error deleting card:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete card")
    } finally {
      setDeleteCardDialogOpen(false)
      setCardToDelete(null)
    }
  }, [cardToDelete])

  // Add new column
  const handleAddColumn = useCallback(async () => {
    if (!newColumnName.trim()) return

    try {
      const res = await (client as any).columns.$post({
        json: {
          boardId: id,
          name: newColumnName.trim(),
        },
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to add column")
      }

      const data = await res.json()
      const newColumn = data.column as KanbanColumn

      setColumns((prev) => [...prev, { id: newColumn.id, name: newColumn.name, color: newColumn.color, order: newColumn.order }])

      setAddColumnDialogOpen(false)
      setNewColumnName("")
    } catch (error) {
      console.error("Error adding column:", error)
      toast.error(error instanceof Error ? error.message : "Failed to add column")
    }
  }, [id, newColumnName])

  // Rename column
  const handleRenameColumn = useCallback(async () => {
    if (!columnToRename || !renameColumnName.trim()) return

    try {
      const res = await (client as any).columns[":id"].$put({
        param: { id: columnToRename.id },
        json: { name: renameColumnName.trim() },
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to rename column")
      }

      setColumns((prev) =>
        prev.map((c) => (c.id === columnToRename.id ? { ...c, name: renameColumnName.trim() } : c))
      )

      setRenameColumnDialogOpen(false)
      setColumnToRename(null)
      setRenameColumnName("")
    } catch (error) {
      console.error("Error renaming column:", error)
      toast.error(error instanceof Error ? error.message : "Failed to rename column")
    }
  }, [columnToRename, renameColumnName])

  // Delete column
  const handleDeleteColumn = useCallback(async (columnId: string) => {
    try {
      const res = await (client as any).columns[":id"].$delete({
        param: { id: columnId },
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to delete column")
      }

      setColumns((prev) => prev.filter((c) => c.id !== columnId))
      setCards((prev) => prev.filter((c) => c.column !== columnId))
      toast.success("Column deleted")
    } catch (error) {
      console.error("Error deleting column:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete column")
    }
  }, [])

  // Format due date for display
  const formatDueDate = (date: Date | null | undefined) => {
    if (!date) return null
    const d = new Date(date)
    return format(d, "MMM d, yyyy")
  }

  // Check if due date is overdue
  const isOverdue = (date: Date | null | undefined) => {
    if (!date) return false
    return new Date(date) < new Date()
  }

  return (
    <div className="relative w-full flex-1 h-full overflow-hidden flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto w-full scroll-smooth">
        <div className="mx-auto w-full max-w-[1200px] px-6 md:px-12 py-12 pb-32">
          {/* 1. Big Title Area */}
          <div className="group relative mb-2">
            <TextareaAutosize
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Untitled"
              className="w-full resize-none border-none bg-transparent px-0 text-4xl md:text-5xl font-extrabold tracking-tight placeholder:text-muted-foreground/30 focus:outline-none focus:ring-0"
              minRows={1}
            />
          </div>

          {/* 2. Subtitle / Description */}
          <div className="group relative mb-8">
            <TextareaAutosize
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              placeholder="Add a description..."
              className="w-full resize-none border-none bg-transparent px-0 text-lg md:text-xl text-muted-foreground focus:outline-none placeholder:text-muted-foreground/40"
              minRows={1}
            />
          </div>

          {/* 3. Kanban Board */}
          <div className="min-h-[400px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Board</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddColumnDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Column
              </Button>
            </div>

            {columns.length > 0 ? (
              <KanbanProvider
                columns={columns}
                data={cards}
                onDataChange={(newData) => setCards(newData as KanbanItem[])}
                onDragEnd={handleDragEnd}
              >
                {(column) => (
                  <KanbanBoard key={column.id} id={column.id} className="bg-muted/50! dark:bg-muted/20!">
                    <KanbanHeader className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: getColumnColor(column.name, (column as KanbanColumnItem).color) }}
                        />
                        <span className="font-semibold">{column.name}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          {cards.filter(c => c.column === column.id).length}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setAddCardColumnId(column.id)
                            setAddCardDialogOpen(true)
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setColumnToRename({ id: column.id, name: column.name })
                                setRenameColumnName(column.name)
                                setRenameColumnDialogOpen(true)
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteColumn(column.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </KanbanHeader>
                    <KanbanCards id={column.id}>
                      {(item) => (
                        <KanbanCard 
                          key={item.id} 
                          id={item.id} 
                          name={item.name} 
                          column={item.column}
                          className="group/card bg-card! hover:bg-accent/50! transition-colors shadow-sm! hover:shadow-md! cursor-pointer"
                        >
                          <div 
                            className="flex flex-col gap-2"
                            onClick={() => { setViewingCard(item as KanbanItem); setViewCardDialogOpen(true); }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="m-0 font-medium text-sm flex-1 leading-snug">{item.name}</p>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" side="bottom" sideOffset={4} onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); openEditCardDialog(item as KanbanItem); }}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => { e.stopPropagation(); setCardToDelete(item as KanbanItem); setDeleteCardDialogOpen(true); }}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            {(item as KanbanItem).dueDate && (
                              <div className={cn(
                                "flex items-center gap-1.5 text-xs",
                                isOverdue((item as KanbanItem).dueDate) 
                                  ? "text-destructive" 
                                  : "text-muted-foreground"
                              )}>
                                <CalendarIcon className="h-3 w-3" />
                                <span>{formatDueDate((item as KanbanItem).dueDate)}</span>
                              </div>
                            )}
                          </div>
                        </KanbanCard>
                      )}
                    </KanbanCards>
                  </KanbanBoard>
                )}
              </KanbanProvider>
            ) : (
              <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No columns yet. Add your first column to get started.</p>
              </div>
            )}
          </div>

          {/* Status Indicator */}
          <div className="fixed bottom-4 right-6 text-xs text-muted-foreground/60 transition-opacity bg-background/50 backdrop-blur-md px-2 py-1 rounded-md">
            {isSaving ? "Saving..." : hasChanges ? "Unsaved changes" : ""}
          </div>
        </div>
      </div>

      {/* Add Card Dialog */}
      <Dialog open={addCardDialogOpen} onOpenChange={setAddCardDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Card</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="card-name">Title</Label>
              <Input
                id="card-name"
                value={newCardName}
                onChange={(e) => setNewCardName(e.target.value)}
                placeholder="Card title"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleAddCard()
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-description">Description (optional)</Label>
              <Textarea
                id="card-description"
                value={newCardDescription}
                onChange={(e) => setNewCardDescription(e.target.value)}
                placeholder="Add a description..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Button type="button" variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newCardDueDate ? format(newCardDueDate, "PPP") : <span className="text-muted-foreground">Pick a date</span>}
                    </Button>
                    {newCardDueDate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1/2 right-1 -translate-y-1/2 h-6 w-6"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setNewCardDueDate(undefined); }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newCardDueDate}
                    onSelect={setNewCardDueDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCardDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCard} disabled={!newCardName.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Card Dialog */}
      <Dialog open={editCardDialogOpen} onOpenChange={setEditCardDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Card</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-card-name">Title</Label>
              <Input
                id="edit-card-name"
                value={editCardName}
                onChange={(e) => setEditCardName(e.target.value)}
                placeholder="Card title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-card-description">Description</Label>
              <Textarea
                id="edit-card-description"
                value={editCardDescription}
                onChange={(e) => setEditCardDescription(e.target.value)}
                placeholder="Add a description..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Button type="button" variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editCardDueDate ? format(editCardDueDate, "PPP") : <span className="text-muted-foreground">Pick a date</span>}
                    </Button>
                    {editCardDueDate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1/2 right-1 -translate-y-1/2 h-6 w-6"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditCardDueDate(undefined); }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editCardDueDate}
                    onSelect={setEditCardDueDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCardDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCard} disabled={!editCardName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Column Dialog */}
      <Dialog open={addColumnDialogOpen} onOpenChange={setAddColumnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Column</DialogTitle>
          </DialogHeader>
          <Input
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            placeholder="Column name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleAddColumn()
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddColumnDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddColumn}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Column Dialog */}
      <Dialog open={renameColumnDialogOpen} onOpenChange={setRenameColumnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Column</DialogTitle>
          </DialogHeader>
          <Input
            value={renameColumnName}
            onChange={(e) => setRenameColumnName(e.target.value)}
            placeholder="Column name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleRenameColumn()
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameColumnDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameColumn}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Card Confirmation */}
      <AlertDialog open={deleteCardDialogOpen} onOpenChange={setDeleteCardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Card</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{cardToDelete?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCardToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Card Detail */}
      <Dialog open={viewCardDialogOpen} onOpenChange={setViewCardDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          {viewingCard && (
            <>
              <DialogHeader className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <DialogTitle className="text-xl font-semibold leading-tight">
                    {viewingCard.name}
                  </DialogTitle>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Column Badge */}
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: getColumnColor(columns.find(c => c.id === viewingCard.column)?.name || "", columns.find(c => c.id === viewingCard.column)?.color) }}
                    />
                    {columns.find(c => c.id === viewingCard.column)?.name || "Unknown"}
                  </div>
                  {/* Due Date Badge */}
                  {viewingCard.dueDate && (
                    <div className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                      isOverdue(viewingCard.dueDate)
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary"
                    )}>
                      <CalendarIcon className="h-3 w-3" />
                      {formatDueDate(viewingCard.dueDate)}
                      {isOverdue(viewingCard.dueDate) && <span className="font-semibold">Overdue</span>}
                    </div>
                  )}
                </div>
              </DialogHeader>
              
              {/* Description */}
              <div className="mt-4">
                {viewingCard.description ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {viewingCard.description}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border-2 border-dashed border-muted p-6 text-center">
                    <p className="text-sm text-muted-foreground">No description added</p>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-6 flex-row gap-2 sm:justify-between">
                <Button
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setViewCardDialogOpen(false)
                    setCardToDelete(viewingCard)
                    setDeleteCardDialogOpen(true)
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <Button
                  onClick={() => {
                    setViewCardDialogOpen(false)
                    openEditCardDialog(viewingCard)
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Card
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
