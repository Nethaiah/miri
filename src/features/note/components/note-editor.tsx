"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor"
import { client } from "@/lib/api-client"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import TextareaAutosize from "react-textarea-autosize"
import { emitNoteUpdated } from "@/lib/note-events"

type NoteEditorProps = {
  id: string
  title: string
  description: string | null
  content: string
}

export function NoteEditor({ id, title, description, content }: NoteEditorProps) {
  const [draftTitle, setDraftTitle] = useState(title || "")
  const [draftDescription, setDraftDescription] = useState(description || "")
  const [draftContent, setDraftContent] = useState(content || "")
  const [isSaving, setIsSaving] = useState(false)

  const initialDraft = useMemo(
    () => ({
      title: title || "",
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
          title: draftTitle || "Untitled",
          description: draftDescription || null,
          content: draftContent,
        },
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to save note")
      }

      emitNoteUpdated({
        id,
        title: draftTitle || "Untitled",
        description: draftDescription || null,
        content: draftContent,
      })

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
    <div className="relative w-full flex-1 h-full overflow-hidden flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto w-full scroll-smooth">
        <div className="mx-auto w-full max-w-[1000px] px-6 md:px-12 py-12 pb-32">
          
          {/* 1. Big Title Area */}
          <div className="group relative mb-2">
            <TextareaAutosize
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
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
              placeholder="Add a summary or description..."
              className="w-full resize-none border-none bg-transparent px-0 text-lg md:text-xl text-muted-foreground focus:outline-none placeholder:text-muted-foreground/40"
              minRows={1}
            />
          </div>

          {/* 3. The Editor */}
          <div className="min-h-[500px]">
            <SimpleEditor
              initialContent={draftContent}
              onContentChange={setDraftContent}
            />
          </div>

          {/* Status Indicator */}
          <div className="fixed bottom-4 right-6 text-xs text-muted-foreground/60 transition-opacity bg-background/50 backdrop-blur-md px-2 py-1 rounded-md">
            {isSaving ? "Saving..." : hasChanges ? "Unsaved changes" : ""}
          </div>
        </div>
      </div>
    </div>
  )
}