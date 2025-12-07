import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { SuggestionItem } from "./suggestion-menu-types";

/**
 * Filters and prioritizes suggestion items based on a search query.
 * @param items - Array of suggestion items to filter
 * @param query - Search query string
 * @returns Filtered and prioritized array of items
 */
export function filterSuggestionItems<T = any>(
  items: SuggestionItem<T>[],
  query: string,
): SuggestionItem<T>[] {
  if (!query || query.trim() === "") {
    return items;
  }

  const lowerQuery = query.toLowerCase();

  return items
    .map((item) => {
      const titleMatch = item.title.toLowerCase();
      const subtextMatch = item.subtext?.toLowerCase() || "";
      const keywordsMatch = item.keywords?.join(" ").toLowerCase() || "";

      // Calculate match score
      let score = 0;

      // Exact title match
      if (titleMatch === lowerQuery) {
        score = 1000;
      }
      // Title starts with query
      else if (titleMatch.startsWith(lowerQuery)) {
        score = 100;
      }
      // Title contains query
      else if (titleMatch.includes(lowerQuery)) {
        score = 50;
      }
      // Subtext contains query
      else if (subtextMatch.includes(lowerQuery)) {
        score = 25;
      }
      // Keywords contain query
      else if (keywordsMatch.includes(lowerQuery)) {
        score = 10;
      }

      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

/**
 * Calculates the start position of a suggestion command in the text.
 * @param cursorPosition - Current cursor position in document
 * @param previousNode - Text node before cursor
 * @param triggerChar - Character that triggered suggestions
 * @returns Start position of the command
 */
export function calculateStartPosition(
  cursorPosition: number,
  previousNode: ProseMirrorNode | null,
  triggerChar: string,
): number {
  if (!previousNode || !previousNode.isText) {
    return cursorPosition;
  }

  const text = previousNode.text || "";
  const triggerIndex = text.lastIndexOf(triggerChar);

  if (triggerIndex === -1) {
    return cursorPosition;
  }

  const nodeStartPos = cursorPosition - text.length;
  return nodeStartPos + triggerIndex;
}
