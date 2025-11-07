// src/components/folder/FolderDialog.tsx
"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import PRESETS from "@/features/folder-dialog/lib/folder-presets"
import { folderSchema, FolderFormData } from "@/features/folder-dialog/schema/zod-schema"

// try to import Frimousse helper (optional) — adjust path if different in your project
import {
  EmojiPicker,
  EmojiPickerSearch,
  EmojiPickerContent,
  EmojiPickerFooter,
} from "@/components/ui/emoji-picker" // <- change if your emoji component is in a different path

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type Props = {
  parent: string // e.g., "Notes" | "Journal" | "Kanban"
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onCreate?: (payload: { parent: string; name: string; emoji: string }) => void
}

export function FolderDialog({ parent, onCreate, open: openProp, onOpenChange }: Props) {
  const [open, setOpen] = React.useState<boolean>(!!openProp)
  React.useEffect(() => {
    if (typeof openProp === "boolean") setOpen(openProp)
  }, [openProp])

  const form = useForm<FolderFormData>({
    resolver: zodResolver(folderSchema),
    defaultValues: {
      name: "",
      emoji: "",
    },
  })

  React.useEffect(() => {
    if (typeof onOpenChange === "function") onOpenChange(open)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const presets = PRESETS[parent] ?? []

  const handleCreate = (data: FolderFormData) => {
    // default behavior: console.log + toast, invoke callback
    const payload = { parent, name: data.name.trim(), emoji: data.emoji }
    console.log("Created folder:", payload)
    toast.success(`${payload.emoji} ${payload.name} created under ${parent}`, {
      description: `${payload.name} was added to ${parent}`,
    })
    if (onCreate) onCreate(payload)
    setOpen(false)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Create new folder under ${parent}`} className="justify-start w-full">
          + New Folder
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{parent === "Kanban" ? "New Board" : "New Folder"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleCreate)}
          className="space-y-4"
          id={`create-folder-form-${parent}`}
        >
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor={`folder-name-${parent}`}>Name</FieldLabel>
                  <Input id={`folder-name-${parent}`} {...field} placeholder={parent === "Kanban" ? "e.g. Projects" : "e.g. Personal"} />
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="emoji"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel>Emoji</FieldLabel>

                  <div className="flex gap-2 items-center">
                    {/* Preset badges */}
                    <div className="flex gap-2 flex-wrap">
                      {presets.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => field.onChange(p.emoji)}
                          className={cn(
                            "inline-flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted",
                            field.value === p.emoji ? "ring-2 ring-offset-1 ring-primary" : "border"
                          )}
                        >
                          <span>{p.emoji}</span>
                          <span className="truncate max-w-[8rem]">{p.name}</span>
                        </button>
                      ))}
                    </div>

                    {/* Emoji picker popover */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="ml-auto">
                          {field.value || "Pick"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-[320px] p-0">
                        {/* If you have Frimousse picker component available, it will render */}
                        {/* The import path may differ, adjust as needed. */}
                        <div className="h-72">
                          <EmojiPicker>
                            <EmojiPickerSearch />
                            <EmojiPickerContent />
                            <EmojiPickerFooter />
                          </EmojiPicker>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter>
            <div className="flex items-center justify-end w-full gap-2">
              <Button type="button" variant="ghost" onClick={() => { setOpen(false); form.reset(); }}>
                Cancel
              </Button>
              <Button type="submit" form={`create-folder-form-${parent}`}>
                Create
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
