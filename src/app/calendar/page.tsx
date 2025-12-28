"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { client } from "@/lib/api-client"
import { toast } from "sonner"
import { Plus, X, Check, ChevronsUpDown, ExternalLink } from "lucide-react"
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns"
import { useRouter } from "next/navigation"
import {
  CalendarProvider,
  CalendarDate,
  CalendarDatePicker,
  CalendarMonthPicker,
  CalendarYearPicker,
  CalendarDatePagination,
  CalendarHeader,
  CalendarBody,
  CalendarItem,
  useCalendarMonth,
  useCalendarYear,
  type Feature,
  type Status,
} from "@/components/kibo-ui/calendar"
import {
  ColorPicker,
  ColorPickerHue,
  ColorPickerSelection,
  ColorPickerAlpha,
  ColorPickerEyeDropper,
  ColorPickerOutput,
  ColorPickerFormat,
} from "@/components/kibo-ui/color-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
import { cn } from "@/lib/utils"
import type { CalendarEvent, Note, Folder } from "@/db/schema"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

// Default statuses for different event types
const EVENT_STATUS: Status = { id: "event", name: "Event", color: "#3b82f6" } // Blue
const KANBAN_STATUS: Status = { id: "kanban", name: "Kanban Due", color: "#f59e0b" } // Orange
const NOTE_STATUS: Status = { id: "note", name: "Note", color: "#10b981" } // Green

type KanbanDueDate = {
  id: string
  name: string
  dueDate: Date
  columnName: string
  columnColor?: string | null
  description?: string | null
  boardName: string
  boardId: string
}

function CalendarPageContent() {
  const router = useRouter()
  const [month] = useCalendarMonth()
  const [year] = useCalendarYear()

  // State
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [kanbanDueDates, setKanbanDueDates] = useState<KanbanDueDate[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Add/Edit event dialog
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [eventTitle, setEventTitle] = useState("")
  const [eventDescription, setEventDescription] = useState("")
  const [eventStartDate, setEventStartDate] = useState<Date | undefined>(new Date())
  const [eventEndDate, setEventEndDate] = useState<Date | undefined>(new Date())
  const [eventColor, setEventColor] = useState("#3b82f6")
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [isNotePopoverOpen, setIsNotePopoverOpen] = useState(false)

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null)

  // View event dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingEvent, setViewingEvent] = useState<Feature | null>(null)

  // Day view dialog (for "more" events)
  const [dayViewDialogOpen, setDayViewDialogOpen] = useState(false)
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null)
  const [dayViewFeatures, setDayViewFeatures] = useState<Feature[]>([])

  // Fetch events for current month
  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true)
      const currentDate = new Date(year, month, 1)
      const start = startOfMonth(subMonths(currentDate, 1))
      const end = endOfMonth(addMonths(currentDate, 1))

      const res = await (client as any).calendar.$get({
        query: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
      })

      if (!res.ok) throw new Error("Failed to fetch events")
      const data = await res.json()

      setEvents(data.events || [])
      setKanbanDueDates((data.kanbanDueDates || []).filter((k: any) => k.dueDate))
    } catch (error) {
      console.error("Error fetching events:", error)
      toast.error("Failed to load calendar events")
    } finally {
      setIsLoading(false)
    }
  }, [month, year])

  // Fetch notes and folders
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [notesRes, foldersRes] = await Promise.all([
          (client as any).notes.$get(),
          (client as any).folders.$get()
        ])

        if (notesRes.ok) {
          const data = await notesRes.json()
          setNotes(data.notes || [])
        }

        if (foldersRes.ok) {
          const data = await foldersRes.json()
          setFolders(data.folders || [])
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }
    void fetchData()
  }, [])

  useEffect(() => {
    void fetchEvents()
  }, [fetchEvents])

  // Transform events to Feature format for the calendar
  const features: Feature[] = useMemo(() => {
    const calendarFeatures: Feature[] = events.map((event) => ({
      id: event.id,
      name: event.title,
      startAt: new Date(event.startAt),
      endAt: new Date(event.endAt),
      status: {
        id: "event",
        name: "Event",
        color: event.color || "#3b82f6",
      },
    }))

    const kanbanFeatures: Feature[] = kanbanDueDates.map((card) => ({
      id: `kanban-${card.id}`,
      name: `📋 ${card.name}`,
      startAt: new Date(card.dueDate),
      endAt: new Date(card.dueDate),
      status: { ...KANBAN_STATUS, color: card.columnColor || KANBAN_STATUS.color },
    }))

    const noteFeatures: Feature[] = notes.map((note) => {
      const folder = folders.find(f => f.id === note.folderId)
      return {
        id: `note-${note.id}`,
        name: `📝 ${note.title}`,
        startAt: new Date(note.createdAt),
        endAt: new Date(note.createdAt),
        status: { ...NOTE_STATUS, color: folder?.color || NOTE_STATUS.color },
      }
    })

    return [...calendarFeatures, ...kanbanFeatures, ...noteFeatures]
  }, [events, kanbanDueDates, notes, folders])

  // Open add event dialog
  const openAddEventDialog = useCallback(() => {
    setEditingEvent(null)
    setEventTitle("")
    setEventDescription("")
    setEventStartDate(new Date())
    setEventEndDate(new Date())
    setEventColor("#3b82f6")
    setSelectedNoteId(null)
    setEventDialogOpen(true)
  }, [])

  // Open edit event dialog
  const openEditEventDialog = useCallback((event: CalendarEvent) => {
    setEditingEvent(event)
    setEventTitle(event.title)
    setEventDescription(event.description || "")
    setEventStartDate(new Date(event.startAt))
    setEventEndDate(new Date(event.endAt))
    setEventColor(event.color || "#3b82f6")
    setSelectedNoteId(event.noteId || null)
    setEventDialogOpen(true)
  }, [])

  // Handle save event
  const handleSaveEvent = useCallback(async () => {
    if (!eventTitle.trim() || !eventStartDate || !eventEndDate) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      if (editingEvent) {
        // Update existing event
        const res = await (client as any).calendar[":id"].$put({
          param: { id: editingEvent.id },
          json: {
            title: eventTitle.trim(),
            description: eventDescription.trim() || null,
            startAt: eventStartDate.toISOString(),
            endAt: eventEndDate.toISOString(),
            color: eventColor,
            noteId: selectedNoteId,
          },
        })

        if (!res.ok) throw new Error("Failed to update event")

        await fetchEvents()
        toast.success("Event updated")
      } else {
        // Create new event
        const res = await (client as any).calendar.$post({
          json: {
            title: eventTitle.trim(),
            description: eventDescription.trim() || null,
            startAt: eventStartDate.toISOString(),
            endAt: eventEndDate.toISOString(),
            color: eventColor,
            noteId: selectedNoteId,
          },
        })

        if (!res.ok) throw new Error("Failed to create event")

        await fetchEvents()
        toast.success("Event created")
      }

      setEventDialogOpen(false)
    } catch (error) {
      console.error("Error saving event:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save event")
    }
  }, [editingEvent, eventTitle, eventDescription, eventStartDate, eventEndDate, eventColor, selectedNoteId, fetchEvents])

  // Handle delete event
  const handleDeleteEvent = useCallback(async () => {
    if (!eventToDelete) return

    try {
      const res = await (client as any).calendar[":id"].$delete({
        param: { id: eventToDelete.id },
      })

      if (!res.ok) throw new Error("Failed to delete event")

      await fetchEvents()
      toast.success("Event deleted")
    } catch (error) {
      console.error("Error deleting event:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete event")
    } finally {
      setDeleteDialogOpen(false)
      setEventToDelete(null)
    }
  }, [eventToDelete, fetchEvents])

  // Handle feature click
  const handleFeatureClick = useCallback((e: React.MouseEvent, feature: Feature) => {
    e.stopPropagation() // Prevent triggering day click
    
    // Check if it's a kanban item
    if (feature.id.startsWith("kanban-")) {
      // For kanban items, just show info
      setViewingEvent(feature)
      setViewDialogOpen(true)
    } else if (feature.id.startsWith("note-")) {
      // For notes, navigate to note
      const noteId = feature.id.replace("note-", "")
      router.push(`/note/${noteId}`)
    } else {
      // For calendar events, open edit dialog
      const event = events.find((e) => e.id === feature.id)
      if (event) {
        openEditEventDialog(event)
      }
    }
  }, [events, openEditEventDialog, router])

  // Handle more click
  const handleMoreClick = useCallback((date: Date, features: Feature[]) => {
    setDayViewDate(date)
    setDayViewFeatures(features)
    setDayViewDialogOpen(true)
  }, [])

  // Handle day click
  const handleDayClick = useCallback((date: Date) => {
    setEditingEvent(null)
    setEventTitle("")
    setEventDescription("")
    setEventStartDate(date)
    setEventEndDate(date)
    setEventEndDate(date)
    setEventColor("#3b82f6")
    setSelectedNoteId(null)
    setEventDialogOpen(true)
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <Button onClick={openAddEventDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      <CalendarProvider className="flex-1 p-4">
        <CalendarDate>
          <CalendarDatePicker>
            <CalendarMonthPicker />
            <CalendarYearPicker start={2020} end={2030} />
          </CalendarDatePicker>
          <CalendarDatePagination />
        </CalendarDate>
        <CalendarHeader />
        <CalendarBody features={features} onDayClick={handleDayClick} onMoreClick={handleMoreClick}>
          {({ feature }) => (
            <button
              key={feature.id}
              onClick={(e) => handleFeatureClick(e, feature)}
              className="w-full text-left"
            >
              <CalendarItem feature={feature} />
            </button>
          )}
        </CalendarBody>
      </CalendarProvider>

      {/* Add/Edit Event Dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Add Event"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Event title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="Event description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !eventStartDate && "text-muted-foreground"
                      )}
                    >
                      {eventStartDate ? format(eventStartDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={eventStartDate}
                      onSelect={setEventStartDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label>End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !eventEndDate && "text-muted-foreground"
                      )}
                    >
                      {eventEndDate ? format(eventEndDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={eventEndDate}
                      onSelect={setEventEndDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Link Note</Label>
              <div className="flex gap-2">
                <Popover open={isNotePopoverOpen} onOpenChange={setIsNotePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isNotePopoverOpen}
                      className="w-full justify-between"
                    >
                      {selectedNoteId
                        ? notes.find((note) => note.id === selectedNoteId)?.title
                        : "Select a note..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Search notes..." />
                      <CommandList>
                        <CommandEmpty>No note found.</CommandEmpty>
                        <CommandGroup>
                          {notes.map((note) => (
                            <CommandItem
                              key={note.id}
                              value={note.title}
                              onSelect={() => {
                                setSelectedNoteId(note.id === selectedNoteId ? null : note.id)
                                setIsNotePopoverOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedNoteId === note.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {note.title}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedNoteId && (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => router.push(`/note/${selectedNoteId}`)}
                    title="Open Note"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Color</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                  >
                    <div 
                      className="w-4 h-4 rounded-full border shadow-sm"
                      style={{ backgroundColor: eventColor }}
                    />
                    <span className="font-mono text-muted-foreground">
                      {eventColor}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4 content-box" align="start">
                  <ColorPicker
                    value={eventColor}
                    onChange={(v: any) => {
                       const hex = "#" + v.slice(0, 3).map((c: number) => Math.round(c).toString(16).padStart(2, '0')).join('')
                       setEventColor(hex)
                    }}
                  >
                     <div className="flex w-full flex-col gap-4">
                       <ColorPickerSelection className="aspect-square w-full rounded-md border" />
                       <div className="flex flex-col gap-2">
                         <div className="flex items-center gap-2">
                           <ColorPickerEyeDropper />
                           <div className="flex w-full flex-col gap-2">
                             <ColorPickerHue />
                             <ColorPickerAlpha />
                           </div>
                         </div>
                         <div className="flex items-center gap-2">
                           <ColorPickerOutput />
                           <ColorPickerFormat />
                         </div>
                       </div>
                     </div>
                  </ColorPicker>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            {editingEvent && (
              <Button
                variant="destructive"
                onClick={() => {
                  setEventToDelete(editingEvent)
                  setDeleteDialogOpen(true)
                  setEventDialogOpen(false)
                }}
              >
                Delete
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEventDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEvent}>
                {editingEvent ? "Save" : "Create"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Event Dialog (for Kanban items) */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>Kanban Due Date</DialogTitle>
          </DialogHeader>
          {viewingEvent && (
            <div className="py-4">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: viewingEvent.status.color }}
                />
                <span className="font-medium">{viewingEvent.name.replace("📋 ", "")}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Due: {format(viewingEvent.endAt, "PPP")}
              </p>
              {viewingEvent.id.startsWith("kanban-") && (() => {
                 const cardId = viewingEvent.id.replace("kanban-", "")
                 const card = kanbanDueDates.find(k => k.id === cardId)
                 if (card) {
                   return (
                     <>
                       <div className="mt-2 flex items-center gap-2">
                         <span className="text-sm text-muted-foreground">Status:</span>
                         <div className="flex items-center gap-1.5">
                           <div
                             className="h-2 w-2 rounded-full"
                             style={{ backgroundColor: card.columnColor || viewingEvent.status.color }}
                           />
                           <span className="text-sm font-medium">{card.columnName}</span>
                         </div>
                       </div>
                       {card.description && (
                         <div className="mt-4 text-sm whitespace-pre-wrap rounded-md bg-muted p-2 text-muted-foreground">
                           {card.description}
                         </div>
                       )}
                     </>
                   )
                 }
                 return null
              })()}
            </div>
          )}
          <DialogFooter>
            {viewingEvent?.id.startsWith("kanban-") && (
              <Button 
                variant="outline"
                className="mr-auto"
                onClick={() => {
                   const cardId = viewingEvent.id.replace("kanban-", "")
                   const card = kanbanDueDates.find(k => k.id === cardId)
                   if (card) router.push(`/board/${card.boardId}`)
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Board
              </Button>
            )}
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Day View Dialog (All items for a day) */}
      <Dialog open={dayViewDialogOpen} onOpenChange={setDayViewDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{dayViewDate ? format(dayViewDate, "PPP") : "Events"}</DialogTitle>
          </DialogHeader>
          <div className="py-4 flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
            {dayViewFeatures.map((feature) => (
              <button
                key={feature.id}
                onClick={(e) => {
                  handleFeatureClick(e, feature)
                  setDayViewDialogOpen(false)
                }}
                className="w-full text-left transition-colors hover:bg-muted/50 rounded-md p-1"
              >
                <CalendarItem feature={feature} />
              </button>
            ))}
            {dayViewFeatures.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No events for this day</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDayViewDialogOpen(false)}>Close</Button>
            <Button onClick={() => {
              if (dayViewDate) {
                setDayViewDialogOpen(false)
                handleDayClick(dayViewDate)
              }
            }}>
              <Plus className="h-4 w-4 mr-2" /> Add Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{eventToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function CalendarPage() {
  return <CalendarPageContent />
}
