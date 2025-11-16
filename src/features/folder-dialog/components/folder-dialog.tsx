"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"

import {
  EmojiPicker,
  EmojiPickerSearch,
  EmojiPickerContent,
  EmojiPickerFooter,
} from "@/components/ui/emoji-picker"

import { FOLDER_PRESETS } from "@/features/folder-dialog/lib/folder-presets"
import { folderSchema, type FolderFormData } from "@/features/folder-dialog/schema/zod-schema"

type Props = {
  parent: "Notes" | "Journals" | "Kanbans"
  onCreate?: (payload: FolderFormData & { parent: string }) => void
  onUpdate?: (payload: FolderFormData & { parent: string; originalName: string }) => void
  initialData?: { name: string; parent: string }
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function FolderDialog({ 
  parent, 
  onCreate, 
  onUpdate,
  initialData,
  open: controlledOpen,
  onOpenChange
}: Props) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  
  // Use controlled open if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const isEditMode = !!initialData

  const form = useForm<FolderFormData>({
    resolver: zodResolver(folderSchema),
    defaultValues: { name: "", emoji: "", description: "" },
  })

  // Prefill form when initialData changes (edit mode)
  React.useEffect(() => {
    if (initialData && open) {
      // Extract emoji from name if present
      const emojiRegex = /[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu
      const emojis = initialData.name.match(emojiRegex)
      const emoji = emojis?.[0] || ""
      
      form.reset({
        name: initialData.name,
        emoji: emoji,
        description: ""
      })
    } else if (!open) {
      // Reset form when dialog closes
      form.reset({ name: "", emoji: "", description: "" })
    }
  }, [initialData, open, form])

  const handleSubmit = (data: FolderFormData) => {
    const payload = { ...data, parent }

    if (isEditMode && onUpdate && initialData) {
      toast.success(`${data.name} updated`, {
        description: data.description || "Folder successfully updated!",
      })
      onUpdate({ ...payload, originalName: initialData.name })
    } else {
      toast.success(`${data.name} created under ${parent}`, {
        description: data.description || "Folder successfully created!",
      })
      onCreate?.(payload)
    }

    setOpen(false)
    form.reset()
  }

  // handle emoji selection → inject into name input
  const handleEmojiSelect = (emoji: string) => {
    const currentName = form.getValues("name")
    form.setValue("emoji", emoji)
    
    // Remove any existing emojis from the name first
    const emojiRegex = /[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu
    const nameWithoutEmojis = currentName.replace(emojiRegex, '').trim()
    
    // Add the new emoji at the start
    form.setValue("name", `${emoji} ${nameWithoutEmojis}`)
    
    // Trigger validation
    form.trigger("name")
  }

  const presets = FOLDER_PRESETS[parent] || []

  const labelText =
    parent === "Kanbans"
      ? "+ Kanban Board"
      : parent === "Journals"
      ? "+ Journal Folder"
      : "+ Note Folder"

  const dialogTitle = isEditMode 
    ? (parent === "Kanbans" ? "Rename Board" : "Rename Folder")
    : (parent === "Kanbans" ? "New Board" : "New Folder")

  const dialogDescription = isEditMode
    ? `Update the ${parent === "Kanbans" ? "board" : "folder"} name and details.`
    : `Complete the form below to create a new ${parent === "Kanbans" ? "board" : "folder"} under ${parent}.`

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isEditMode && (
        <DialogTrigger asChild className="w-full justify-start text-sm h-8 px-2">
          <div className="w-full">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm h-8 px-2"
            >
              {labelText}
            </Button>
          </div>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <span>
              {parent === "Notes" && "🗒️"}
              {parent === "Journals" && "📓"}
              {parent === "Kanbans" && "📋"}
            </span>
            {dialogTitle}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {dialogDescription}
          </p>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
          id={`form-${parent}`}
        >
          <FieldGroup>
            {/* Preset folder cards - only show in create mode */}
            {!isEditMode && presets.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      form.setValue("emoji", preset.emoji)
                      form.setValue("name", `${preset.emoji} ${preset.name}`)
                      form.trigger("name")
                    }}
                    className="flex items-center justify-start gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
                  >
                    <span>{preset.emoji}</span>
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Name + emoji */}
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel>Folder Name</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          {form.watch("emoji") || "🙂"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto p-0">
                        <div className="h-72">
                          <EmojiPicker
                            onEmojiSelect={(emoji) => handleEmojiSelect(emoji.emoji)}
                          >
                            <EmojiPickerSearch />
                            <EmojiPickerContent />
                            <EmojiPickerFooter />
                          </EmojiPicker>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Input 
                      {...field} 
                      placeholder="e.g. Personal 💡"
                      onChange={(e) => {
                        field.onChange(e)
                        // Update emoji field based on name content
                        const emojiRegex = /[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu
                        const emojis = e.target.value.match(emojiRegex)
                        if (emojis && emojis.length > 0) {
                          form.setValue("emoji", emojis[0])
                        }
                      }}
                    />
                  </div>
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* Description (optional) */}
            <Controller
              name="description"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Description (optional)</FieldLabel>
                  <Textarea {...field} placeholder="Optional folder description..." />
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  form.reset()
                  setOpen(false)
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {isEditMode ? "Update" : "Create"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}