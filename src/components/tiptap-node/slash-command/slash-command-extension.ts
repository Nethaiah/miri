import { Extension } from "@tiptap/core"
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion"

export interface SlashCommandOptions {
  suggestion: Omit<SuggestionOptions, "editor">
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})
