
// Extracts the first emoji from a text string
export function extractEmoji(text: string): string {
  const emojiRegex = /[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu
  const emojis = text.match(emojiRegex)
  return emojis?.[0] || ""
}

// Removes all emojis from a text string
export function removeEmojis(text: string): string {
  const emojiRegex = /[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu
  return text.replace(emojiRegex, '').trim()
}

// hecks if a string contains any emoji
export function hasEmoji(text: string): boolean {
  const emojiRegex = /[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu
  return emojiRegex.test(text)
}


// Adds an emoji to the beginning of a text string, removing any existing emojis
export function prependEmoji(text: string, emoji: string): string {
  const textWithoutEmojis = removeEmojis(text)
  return textWithoutEmojis ? `${emoji} ${textWithoutEmojis}` : emoji
}