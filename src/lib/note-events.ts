export type NoteUpdatedPayload = {
  id: string
  title?: string
  description?: string | null
  content?: string
}

const listeners = new Set<(payload: NoteUpdatedPayload) => void>()

export function emitNoteUpdated(payload: NoteUpdatedPayload) {
  for (const listener of listeners) {
    try {
      listener(payload)
    } catch {
      // ignore listener errors
    }
  }
}

export function subscribeNoteUpdated(
  listener: (payload: NoteUpdatedPayload) => void,
): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
