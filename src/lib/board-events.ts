export type BoardUpdatedPayload = {
  id: string
  name?: string
  description?: string | null
}

const listeners = new Set<(payload: BoardUpdatedPayload) => void>()

export function emitBoardUpdated(payload: BoardUpdatedPayload) {
  for (const listener of listeners) {
    try {
      listener(payload)
    } catch {
      // ignore listener errors
    }
  }
}

export function subscribeBoardUpdated(
  listener: (payload: BoardUpdatedPayload) => void,
): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
