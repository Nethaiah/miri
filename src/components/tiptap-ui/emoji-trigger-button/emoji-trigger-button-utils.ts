import type { Editor } from "@tiptap/react";
import type { Node } from "@tiptap/pm/model";

/**
 * Check if an emoji trigger can be inserted in the current editor state
 */
export function canAddEmojiTrigger(
  editor: Editor | null,
  node?: Node | null,
  nodePos?: number | null
): boolean {
  if (!editor) return false;

  // Check if editor is editable
  if (!editor.isEditable) return false;

  // If node and position are provided, check if we can insert at that position
  if (node && typeof nodePos === "number") {
    try {
      const $pos = editor.state.doc.resolve(nodePos + node.nodeSize);
      return $pos.parent.inlineContent;
    } catch {
      return false;
    }
  }

  // Check if current selection allows text input
  const { selection } = editor.state;
  const { $from } = selection;

  // Can insert text in the current position
  return $from.parent.inlineContent;
}

/**
 * Programmatically insert an emoji trigger at the current selection or specified position
 */
export function addEmojiTrigger(
  editor: Editor | null,
  trigger: string = ":",
  node?: Node | null,
  nodePos?: number | null
): boolean {
  if (!editor) return false;
  if (!canAddEmojiTrigger(editor, node, nodePos)) return false;

  // If node and position are provided, insert at the end of the node
  if (node && typeof nodePos === "number") {
    const insertPos = nodePos + node.nodeSize;
    editor
      .chain()
      .focus()
      .insertContentAt(insertPos, trigger)
      .run();
    return true;
  }

  // Insert at current cursor position
  editor.chain().focus().insertContent(trigger).run();
  return true;
}
