"use client";

import type { Editor } from "@tiptap/react";

import { Button } from "@/components/tiptap-ui-primitive/button";
import { Badge } from "@/components/tiptap-ui-primitive/badge";
import { parseShortcutKeys } from "@/lib/tiptap-utils";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
import { useCopyToClipboard, type UseCopyToClipboardProps } from "./use-copy-to-clipboard";

export interface CopyToClipboardButtonProps
  extends Omit<UseCopyToClipboardProps, "editor"> {
  editor?: Editor | null;
  text?: string;
  showShortcut?: boolean;
}

export function CopyToClipboardButton({
  editor: providedEditor,
  text,
  copyWithFormatting = true,
  hideWhenUnavailable = false,
  onCopied,
  showShortcut = false,
}: CopyToClipboardButtonProps) {
  const { editor } = useTiptapEditor(providedEditor);
  
  const {
    isVisible,
    handleCopyToClipboard,
    canCopyToClipboard: canCopy,
    label,
    shortcutKeys,
    Icon,
  } = useCopyToClipboard({
    editor,
    copyWithFormatting,
    hideWhenUnavailable,
    onCopied,
  });

  if (!isVisible) return null;

  const shortcuts = parseShortcutKeys({ shortcutKeys });

  return (
    <Button
      type="button"
      data-style="ghost"
      onClick={() => void handleCopyToClipboard()}
      disabled={!canCopy}
      aria-label={label}
      tooltip={label}
    >
      <Icon className="tiptap-button-icon" />
      {text && <span className="tiptap-button-text">{text}</span>}
      {showShortcut && shortcuts.length > 0 && (
        <Badge variant="ghost">{shortcuts.join("+")}</Badge>
      )}
    </Button>
  );
}

export default CopyToClipboardButton;
