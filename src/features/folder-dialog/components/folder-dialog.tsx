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
import { 
  folderSchema, 
  type FolderFormData,
  type FolderWithParentData,
  type CategoryType,
} from "@/features/folder-dialog/schema/zod-schema"
import { extractEmoji, removeEmojis, prependEmoji } from "@/features/folder-dialog/lib/emoji-utils"
import { client } from "@/lib/api-client"

type Props = {
  parent: CategoryType
  onCreate?: (payload: FolderWithParentData) => void | Promise<void>
  onUpdate?: (payload: FolderWithParentData & { originalName: string }) => void | Promise<void>
  initialData?: { name: string; parent: CategoryType }
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
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  
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
      const emoji = extractEmoji(initialData.name)
      
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

  const handleSubmit = async (data: FolderFormData) => {
    setIsSubmitting(true)
    
    try {
      const payload: FolderWithParentData = { ...data, parent }

      if (isEditMode && initialData) {
        // Update existing folder via API
        // Find folder ID from the folder name - we'll need to pass it from parent
        // For now, use the onUpdate callback if provided, otherwise call API directly
        if (onUpdate) {
          await onUpdate({ ...payload, originalName: initialData.name })
        } else {
          // If no onUpdate callback, we need the folder ID
          // This will be handled by the parent component
          toast.error("Update requires folder ID")
          return
        }
        toast.success(`${data.name} updated`, {
          description: "Folder successfully updated!",
        })
      } else {
        // Create new folder via API
        if (onCreate) {
          await onCreate(payload)
        } else {
          const res = await (client as any).folders.$post({ json: payload })
          
          if (!res.ok) {
            const error = await res.json()
            throw new Error(error.error || "Failed to create folder")
          }
          
          const result = await res.json()
          toast.success(`${data.name} created under ${parent}`, {
            description: "Folder successfully created!",
          })
        }
      }

      setOpen(false)
      form.reset()
    } catch (error) {
      toast.error("Something went wrong", {
        description: error instanceof Error ? error.message : "Please try again later"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle emoji selection → inject into name input
  const handleEmojiSelect = (emoji: string) => {
    const currentName = form.getValues("name")
    form.setValue("emoji", emoji)
    
    // Use the utility function to prepend emoji
    form.setValue("name", prependEmoji(currentName, emoji))
    
    // Trigger validation
    form.trigger("name")
  }

  // Handle dialog close with unsaved changes confirmation
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && form.formState.isDirty && !isSubmitting) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to close?"
      )
      if (!confirmed) {
        return
      }
    }
    setOpen(newOpen)
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
                    disabled={isSubmitting}
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
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={isSubmitting}
                        >
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
                      disabled={isSubmitting}
                      onChange={(e) => {
                        field.onChange(e)
                        // Update emoji field based on name content using utility
                        const emoji = extractEmoji(e.target.value)
                        if (emoji) {
                          form.setValue("emoji", emoji)
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
                  <Textarea 
                    {...field} 
                    placeholder="Optional folder description..."
                    disabled={isSubmitting}
                  />
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
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting 
                  ? "Saving..." 
                  : isEditMode 
                    ? "Update" 
                    : "Create"
                }
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}