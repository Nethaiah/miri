"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor"
import { client } from "@/lib/api-client"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

type NoteEditorProps = {
  id: string
  title: string
  description: string | null
  content: string
}

export function NoteEditor({ id, title, description, content }: NoteEditorProps) {
  const [draftTitle, setDraftTitle] = useState(title || "New Notes")
  const [draftDescription, setDraftDescription] = useState(description || "")
  const [draftContent, setDraftContent] = useState(content || "")
  const [isSaving, setIsSaving] = useState(false)

  const initialDraft = useMemo(
    () => ({
      title: title || "New Notes",
      description: description || "",
      content: content || "",
    }),
    [title, description, content]
  )

  const [lastSavedDraft, setLastSavedDraft] = useState(initialDraft)

  const hasChanges =
    draftTitle !== lastSavedDraft.title ||
    draftDescription !== lastSavedDraft.description ||
    draftContent !== lastSavedDraft.content

  const saveNote = useCallback(async () => {
    if (!hasChanges) return

    try {
      setIsSaving(true)
      const res = await (client as any).notes[":id"].$put({
        param: { id },
        json: {
          title: draftTitle,
          description: draftDescription || null,
          content: draftContent,
        },
      })

      if (!res.ok) {
        const error = await res.json().catch(() => null)
        throw new Error(error?.error || "Failed to save note")
      }

      setLastSavedDraft({
        title: draftTitle,
        description: draftDescription,
        content: draftContent,
      })
    } catch (error) {
      console.error("Auto-save note error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save note")
    } finally {
      setIsSaving(false)
    }
  }, [id, draftTitle, draftDescription, draftContent, hasChanges])

  useEffect(() => {
    if (!hasChanges) return

    const timeout = setTimeout(() => {
      void saveNote()
    }, 1000)

    return () => clearTimeout(timeout)
  }, [hasChanges, saveNote])

  return (
    <div className="flex w-full flex-1 flex-col gap-4 py-4">
      <div className="flex flex-col gap-2">
        <Input
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          placeholder="New Notes"
          className="text-2xl font-semibold"
        />
        <Textarea
          value={draftDescription}
          onChange={(e) => setDraftDescription(e.target.value)}
          placeholder="Add a description (optional)"
          className="min-h-[60px] resize-none"
        />
      </div>

      <div className="border rounded-md bg-background">
        <SimpleEditor
          initialContent={draftContent}
          onContentChange={setDraftContent}
        />
      </div>

      <div className="text-xs text-muted-foreground self-end">
        {isSaving ? "Saving..." : hasChanges ? "Unsaved changes" : "All changes saved"}
      </div>
    </div>
  )
}
