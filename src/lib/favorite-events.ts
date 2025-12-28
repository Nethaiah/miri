export type FavoriteUpdatedPayload = {
  type: "note" | "board"
  id: string
  favorited: boolean
}

const listeners = new Set<() => void>()

export function emitFavoriteUpdated(payload: FavoriteUpdatedPayload) {
  for (const listener of listeners) {
    try {
      listener()
    } catch {
      // ignore listener errors
    }
  }
}

export function subscribeFavoriteUpdated(
  listener: () => void,
): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
