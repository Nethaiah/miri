"use client";

import type { Editor } from "@tiptap/react";
import type { Node } from "@tiptap/pm/model";

import { Button } from "@/components/tiptap-ui-primitive/button";
import { Badge } from "@/components/tiptap-ui-primitive/badge";
import { parseShortcutKeys } from "@/lib/tiptap-utils";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
import { useEmojiTrigger, type UseEmojiTriggerProps } from "./use-emoji-trigger";

export interface EmojiTriggerButtonProps
  extends Omit<UseEmojiTriggerProps, "editor"> {
  editor?: Editor | null;
  text?: string;
  showShortcut?: boolean;
}

export function EmojiTriggerButton({
  editor: providedEditor,
  node,
  nodePos,
  text,
  trigger = ":",
  hideWhenUnavailable = false,
  onTriggerApplied,
  showShortcut = false,
}: EmojiTriggerButtonProps) {
  const { editor } = useTiptapEditor(providedEditor);
  
  const {
    isVisible,
    handleAddTrigger,
    canAddTrigger,
    label,
    shortcutKeys,
    Icon,
  } = useEmojiTrigger({
    editor,
    node,
    nodePos,
    trigger,
    hideWhenUnavailable,
    onTriggerApplied,
  });

  if (!isVisible) return null;

  const shortcuts = parseShortcutKeys({ shortcutKeys });

  return (
    <Button
      type="button"
      data-style="ghost"
      onClick={handleAddTrigger}
      disabled={!canAddTrigger}
      aria-label={label}
    >
      <Icon className="tiptap-button-icon" />
      {text && <span className="tiptap-button-text">{text}</span>}
      {showShortcut && shortcuts.length > 0 && (
        <Badge variant="ghost">{shortcuts.join("+")}</Badge>
      )}
    </Button>
  );
}

export default EmojiTriggerButton;
