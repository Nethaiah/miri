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

type Props = {
  onCreate?: (payload: FolderFormData) => void | Promise<void>
  onUpdate?: (payload: FolderFormData & { originalName: string }) => void | Promise<void>
  initialData?: { name: string; description?: string }
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
    defaultValues: { name: "", description: "" },
  })

  // Prefill form when initialData changes (edit mode)
  React.useEffect(() => {
    if (initialData && open) {
      form.reset({
        name: initialData.name,
        description: initialData.description || "",
      })
    } else if (!open) {
      // Reset form when dialog closes
      form.reset({ name: "", description: "" })
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