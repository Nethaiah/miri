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
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import { 
  folderSchema, 
  type FolderFormData,
} from "@/features/folder-dialog/schema/folder-schema"

import {
  ColorPicker,
  ColorPickerHue,
  ColorPickerSelection,
  ColorPickerAlpha,
  ColorPickerEyeDropper,
  ColorPickerOutput,
  ColorPickerFormat,
} from "@/components/kibo-ui/color-picker"

type Props = {
  onCreate?: (payload: FolderFormData) => void | Promise<void>
  onUpdate?: (payload: FolderFormData & { originalName: string }) => void | Promise<void>
  initialData?: { name: string; description?: string; color?: string | null }
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function FolderDialog({ 
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
    defaultValues: { name: "", description: "", color: "#3b82f6" },
  })

  // Prefill form when initialData changes (edit mode)
  React.useEffect(() => {
    if (initialData && open) {
      form.reset({
        name: initialData.name,
        description: initialData.description || "",
        color: initialData.color || "#3b82f6",
      })
    } else if (!open) {
      // Reset form when dialog closes
      form.reset({ name: "", description: "", color: "#3b82f6" })
    }
  }, [initialData, open, form])

  const handleSubmit = async (data: FolderFormData) => {
    setIsSubmitting(true)
    
    try {
      if (isEditMode && initialData) {
        // Update existing folder
        if (onUpdate) {
          await onUpdate({ ...data, originalName: initialData.name })
        }

      } else {
        // Create new folder
        if (onCreate) {
          await onCreate(data)
        }
      }

      setOpen(false)
      form.reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
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

  const dialogTitle = isEditMode ? "Rename Folder" : "New Folder"
  const dialogDescription = isEditMode
    ? "Update the folder name and details."
    : "Create a new folder to organize your notes."

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {dialogTitle}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {dialogDescription}
          </p>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
          id="folder-form"
        >
          <FieldGroup>
            {/* Folder Name */}
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel>Folder Name</FieldLabel>
                  <Input 
                    {...field} 
                    placeholder="e.g., Personal Notes"
                    disabled={isSubmitting}
                  />
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* Description (optional) */}
            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel>Description (optional)</FieldLabel>
                  <Textarea 
                    {...field} 
                    placeholder="Optional folder description..."
                    disabled={isSubmitting}
                  />
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* Color Picker */}
            <Controller
              name="color"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Folder Color</FieldLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start gap-2"
                      >
                        <div 
                          className="w-4 h-4 rounded-full border shadow-sm"
                          style={{ backgroundColor: field.value || "#3b82f6" }}
                        />
                        <span className="font-mono text-muted-foreground">
                          {field.value || "#3b82f6"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4 content-box" align="start">
                      <ColorPicker
                        value={field.value || "#3b82f6"}
                        onChange={(v: any) => {
                          const hex = "#" + v.slice(0, 3).map((c: number) => Math.round(c).toString(16).padStart(2, '0')).join('')
                          field.onChange(hex)
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