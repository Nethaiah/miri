"use client";

import { useCallback, useMemo } from "react";
import type { Editor } from "@tiptap/react";
import type { Node } from "@tiptap/pm/model";
import { useHotkeys } from "react-hotkeys-hook";

import { SmilePlusIcon } from "@/components/tiptap-icons/smile-plus-icon";
import { canAddEmojiTrigger, addEmojiTrigger } from "./emoji-trigger-button-utils";

export interface UseEmojiTriggerProps {
  editor: Editor | null;
  node?: Node | null;
  nodePos?: number | null;
  trigger?: string;
  hideWhenUnavailable?: boolean;
  onTriggerApplied?: (trigger: string) => void;
}

export interface UseEmojiTriggerReturn {
  isVisible: boolean;
  canAddTrigger: boolean;
  handleAddTrigger: () => boolean;
  label: string;
  shortcutKeys: string;
  trigger: string;
  Icon: React.FC<React.ComponentPropsWithoutRef<"svg">>;
}

export function useEmojiTrigger({
  editor,
  node,
  nodePos,
  trigger = ":",
  hideWhenUnavailable = false,
  onTriggerApplied,
}: UseEmojiTriggerProps): UseEmojiTriggerReturn {
  const canAddTrigger = useMemo(
    () => canAddEmojiTrigger(editor, node, nodePos),
    [editor, node, nodePos]
  );

  const handleAddTrigger = useCallback(() => {
    const success = addEmojiTrigger(editor, trigger, node, nodePos);
    if (success && onTriggerApplied) {
      onTriggerApplied(trigger);
    }
    return success;
  }, [editor, trigger, node, nodePos, onTriggerApplied]);

  const isVisible = hideWhenUnavailable ? canAddTrigger : true;

  // Register keyboard shortcut: Cmd/Ctrl + Shift + E
  useHotkeys(
    "mod+shift+e",
    (event) => {
      event.preventDefault();
      if (canAddTrigger) {
        handleAddTrigger();
      }
    },
    {
      enabled: !!editor && canAddTrigger,
      enableOnContentEditable: true,
    },
    [editor, canAddTrigger, handleAddTrigger]
  );

  return {
    isVisible,
    canAddTrigger,
    handleAddTrigger,
    label: "Emoji",
    shortcutKeys: "Mod-Shift-E",
    trigger,
    Icon: SmilePlusIcon,
  };
}
