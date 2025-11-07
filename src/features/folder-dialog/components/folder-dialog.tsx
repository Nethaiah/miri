"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"

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

import { cn } from "@/lib/utils"

// 🧩 Folder schema
export const folderSchema = z.object({
  name: z.string().min(1, "Folder name is required"),
  emoji: z.string().min(1, "Please select an emoji"),
  description: z.string().optional(),
})

export type FolderFormData = z.infer<typeof folderSchema>

// 🪶 Preset folders
const PRESETS: Record<string, { emoji: string; name: string }[]> = {
  Notes: [
    { emoji: "💡", name: "Personal" },
    { emoji: "💼", name: "Work" },
    { emoji: "📚", name: "Study" },
  ],
  Journal: [
    { emoji: "📆", name: "Daily Logs" },
    { emoji: "💭", name: "Reflections" },
    { emoji: "🕊️", name: "Gratitude" },
  ],
  Kanban: [
    { emoji: "🚀", name: "Projects" },
    { emoji: "🧠", name: "Learning" },
    { emoji: "🎯", name: "Goals" },
  ],
}

type Props = {
  parent: "Notes" | "Journal" | "Kanban"
  onCreate?: (payload: FolderFormData & { parent: string }) => void
}

export function FolderDialog({ parent, onCreate }: Props) {
  const [open, setOpen] = React.useState(false)

  const form = useForm<FolderFormData>({
    resolver: zodResolver(folderSchema),
    defaultValues: { name: "", emoji: "", description: "" },
  })

  const handleSubmit = (data: FolderFormData) => {
    const payload = { ...data, parent }
    console.log("Created folder:", payload)

    toast.success(`${data.emoji} ${data.name} created under ${parent}`, {
      description: data.description || "Folder successfully created!",
    })

    onCreate?.(payload)
    setOpen(false)
    form.reset()
  }

  // handle emoji selection → inject into name input
  const handleEmojiSelect = (emoji: string) => {
    const currentName = form.getValues("name")
    form.setValue("emoji", emoji)
    if (!currentName.startsWith(emoji)) {
      form.setValue("name", `${emoji} ${currentName.trim()}`)
    }
  }

  const presets = PRESETS[parent] || []

  const labelText =
    parent === "Kanban"
      ? "+ Kanban Board"
      : parent === "Journal"
      ? "+ Journal Folder"
      : "+ Notes Folder"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <span>
              {parent === "Notes" && "🗒️"}
              {parent === "Journal" && "📓"}
              {parent === "Kanban" && "📋"}
            </span>
            {parent === "Kanban" ? "New Board" : "New Folder"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Complete the form below to create a new{" "}
            <span>
              {parent === "Kanban" ? "board" : "folder"}
            </span>{" "}
            under {parent}.
          </p>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
          id={`form-${parent}`}
        >
          <FieldGroup>
            {/* Preset folder cards */}
            {presets.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      form.setValue("emoji", preset.emoji)
                      form.setValue("name", `${preset.emoji} ${preset.name}`)
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
                      <PopoverContent align="start" className="w-[320px] p-0">
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
                    <Input {...field} placeholder="e.g. Personal 💡" />
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
              <Button type="submit">Create</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
