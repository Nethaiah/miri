"use client";

import { useCallback, useMemo } from "react";
import type { Editor } from "@tiptap/react";
import { useHotkeys } from "react-hotkeys-hook";

import { CopyIcon } from "@/components/tiptap-icons/copy-icon";
import { 
  canCopyToClipboard, 
  copyToClipboard 
} from "./copy-to-clipboard-button-utils";

export interface UseCopyToClipboardProps {
  editor: Editor | null;
  copyWithFormatting?: boolean;
  hideWhenUnavailable?: boolean;
  onCopied?: () => void;
}

export interface UseCopyToClipboardReturn {
  isVisible: boolean;
  canCopyToClipboard: boolean;
  handleCopyToClipboard: () => Promise<boolean>;
  label: string;
  shortcutKeys: string;
  Icon: React.FC<React.ComponentPropsWithoutRef<"svg">>;
}

export function useCopyToClipboard({
  editor,
  copyWithFormatting = true,
  hideWhenUnavailable = false,
  onCopied,
}: UseCopyToClipboardProps): UseCopyToClipboardReturn {
  const canCopy = useMemo(
    () => canCopyToClipboard(editor),
    [editor, editor?.state.doc, editor?.state.selection]
  );

  const handleCopyToClipboard = useCallback(async () => {
    const success = await copyToClipboard(editor, copyWithFormatting);
    if (success && onCopied) {
      onCopied();
    }
    return success;
  }, [editor, copyWithFormatting, onCopied]);

  const isVisible = hideWhenUnavailable ? canCopy : true;

  // Register keyboard shortcut: Cmd/Ctrl + C
  // Note: This overrides default browser copy when editor is focused
  useHotkeys(
    "mod+c",
    (event) => {
      event.preventDefault();
      if (canCopy) {
        void handleCopyToClipboard();
      }
    },
    {
      enabled: !!editor && canCopy,
      enableOnContentEditable: true,
    },
    [editor, canCopy, handleCopyToClipboard]
  );

  return {
    isVisible,
    canCopyToClipboard: canCopy,
    handleCopyToClipboard,
    label: "Copy",
    shortcutKeys: "Mod-C",
    Icon: CopyIcon,
  };
}
