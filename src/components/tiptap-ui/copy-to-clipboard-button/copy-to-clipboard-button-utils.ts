import type { Editor } from "@tiptap/react";
import { DOMSerializer } from "prosemirror-model";

/**
 * Write content to the clipboard with optional HTML formatting
 */
export async function writeToClipboard(
  textContent: string,
  htmlContent?: string
): Promise<boolean> {
  try {
    const clipboardItem = new ClipboardItem({
      "text/plain": new Blob([textContent], { type: "text/plain" }),
      ...(htmlContent && {
        "text/html": new Blob([htmlContent], { type: "text/html" }),
      }),
    });

    await navigator.clipboard.write([clipboardItem]);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    
    // Fallback to simple text copy
    try {
      await navigator.clipboard.writeText(textContent);
      return true;
    } catch (fallbackError) {
      console.error("Fallback copy also failed:", fallbackError);
      return false;
    }
  }
}

/**
 * Extract content from the editor (selected or entire document)
 */
export function extractContent(
  editor: Editor,
  copyWithFormatting: boolean = true
): { textContent: string; htmlContent?: string } {
  const { state } = editor;
  const { selection } = state;
  const { from, to } = selection;

  // Check if there's a selection
  const hasSelection = from !== to;

  if (hasSelection) {
    // Get selected content
    const selectedContent = state.doc.cut(from, to);
    const textContent = selectedContent.textContent;
    
    // Serialize fragment to HTML using DOMSerializer
    let htmlContent: string | undefined = undefined;
    if (copyWithFormatting) {
      const div = document.createElement("div");
      const domFragment = DOMSerializer.fromSchema(state.schema).serializeFragment(selectedContent.content);
      div.appendChild(domFragment);
      htmlContent = div.innerHTML;
    }

    return { textContent, htmlContent };
  } else {
    // Get entire document content
    const textContent = editor.getText();
    const htmlContent = copyWithFormatting ? editor.getHTML() : undefined;

    return { textContent, htmlContent };
  }
}

/**
 * Check if content can be copied to clipboard
 */
export function canCopyToClipboard(editor: Editor | null): boolean {
  if (!editor) return false;
  
  // Check if clipboard API is available
  if (!navigator.clipboard) return false;

  // Check if editor has content
  return !editor.isEmpty || !editor.state.selection.empty;
}

/**
 * Copy content to clipboard from the editor
 */
export async function copyToClipboard(
  editor: Editor | null,
  copyWithFormatting: boolean = true
): Promise<boolean> {
  if (!canCopyToClipboard(editor)) return false;

  const { textContent, htmlContent } = extractContent(editor!, copyWithFormatting);

  return await writeToClipboard(textContent, htmlContent);
}
