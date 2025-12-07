"use client";

import type { Editor } from "@tiptap/react";
import type { Node as TiptapNode } from "@tiptap/pm/model";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

// --- Icons ---
import { PlusIcon } from "@/components/tiptap-icons/plus-icon";

// --- Utils ---
import {
  findNodePosition,
  formatShortcutKey,
  isMac,
  isValidPosition,
} from "@/lib/tiptap-utils";

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

export const SLASH_COMMAND_TRIGGER_SHORTCUT_KEY = "mod+/";

export interface UseSlashCommandTriggerConfig {
  /**
   * The editor instance.
   */
  editor?: Editor | null;
  /**
   * The node to check for slash command availability.
   * If not provided, checks the currently selected node.
   */
  node?: TiptapNode | null;
  /**
   * The position of the node in the document.
   */
  nodePos?: number | null;
  /**
   * The slash command trigger character.
   * @default "/"
   */
  trigger?: string;
  /**
   * Whether to hide the button when slash command is not available.
   * @default false
   */
  hideWhenUnavailable?: boolean;
  /**
   * Callback function to be called when the slash command is triggered.
   */
  onTriggered?: (trigger: string) => void;
}

/**
 * Checks if the slash command trigger can be inserted.
 * @param editor The editor instance
 * @param node The node to check (optional)
 * @param nodePos The position of the node (optional)
 * @returns boolean
 */
export const canInsertSlashCommand = (
  editor: Editor | null,
  node?: TiptapNode | null,
  nodePos?: number | null,
): boolean => {
  if (!editor || !editor.isEditable) return false;

  // If specific node/pos provided, check that context
  if (isValidPosition(nodePos)) {
    const nodeFromPos =
      node || (findNodePosition({ editor, nodePos })?.node as TiptapNode | undefined);

    if (!nodeFromPos) return false;
    // Most blocks allow text insertion, but we can return true generally
    // or add specific checks for node types that don't allow text
    return true;
  }

  // Otherwise check current selection
  return editor.can().insertContent("/");
};

/**
 * Inserts the slash command trigger.
 * @param editor The editor instance
 * @param trigger The trigger character to insert (default: "/")
 * @param node The node to insert into (optional)
 * @param nodePos The position of the node (optional)
 * @returns boolean indicating success
 */
export const insertSlashCommand = (
  editor: Editor | null,
  trigger: string = "/",
  node?: TiptapNode | null,
  nodePos?: number | null,
): boolean => {
  if (!editor || !editor.isEditable) return false;

  // If specific position provided
  if (isValidPosition(nodePos)) {
    const nodeInfo = findNodePosition({ editor, node, nodePos });
    if (!nodeInfo) return false;

    // We'll append the trigger to the end of the node's content
    // or you could replace the content. For a trigger, usually appending or setting content is fine.
    // However, the standard behavior for a "button" click near a block
    // often implies "convert this block" or "insert at start".
    // Let's assume we insert at the end of the block for now or start if empty.

    const { pos, node: targetNode } = nodeInfo;
    const endPos = pos + targetNode.content.size + 1; // +1 for opening token

    editor
      .chain()
      .focus()
      .setNodeSelection(pos) // Select the node to ensure we are contextually there?
      // actually, just inserting at pos might be better
      .insertContentAt(endPos, trigger)
      .run();

    // Note: Inserting at specific position when it's just a button often means
    // "Turn this empty paragraph into a command menu"
    // If the node is empty, we might want to just set the content.
    if (targetNode.textContent.length === 0) {
      editor
        .chain()
        .focus()
        .setTextSelection(pos + 1)
        .insertContent(trigger)
        .run();
    } else {
      // Append
      editor
        .chain()
        .focus()
        .setTextSelection(pos + targetNode.content.size + 1)
        .insertContent(" " + trigger)
        .run();
    }

    return true;
  }

  // Otherwise insert at current selection
  return editor.chain().focus().insertContent(trigger).run();
};

export function useSlashCommandTrigger(
  config: UseSlashCommandTriggerConfig = {},
) {
  const {
    editor: providedEditor,
    node,
    nodePos,
    trigger = "/",
    hideWhenUnavailable = false,
    onTriggered,
  } = config;

  const { editor } = useTiptapEditor(providedEditor);
  const [canInsert, setCanInsert] = useState(false);

  // Determine if we should show the button
  const isVisible = useMemo(() => {
    if (hideWhenUnavailable && !canInsert) return false;
    return true;
  }, [hideWhenUnavailable, canInsert]);

  // Check availability
  useEffect(() => {
    if (!editor) return;

    const checkAvailability = () => {
      setCanInsert(canInsertSlashCommand(editor, node, nodePos));
    };

    checkAvailability();

    editor.on("selectionUpdate", checkAvailability);
    editor.on("update", checkAvailability);
    editor.on("transaction", checkAvailability);

    return () => {
      editor.off("selectionUpdate", checkAvailability);
      editor.off("update", checkAvailability);
      editor.off("transaction", checkAvailability);
    };
  }, [editor, node, nodePos]);

  const handleSlashCommand = useCallback(() => {
    if (!editor) return false;

    const success = insertSlashCommand(editor, trigger, node, nodePos);

    if (success) {
      onTriggered?.(trigger);
    }

    return success;
  }, [editor, trigger, node, nodePos, onTriggered]);

  // Keyboard shortcut
  useHotkeys(
    SLASH_COMMAND_TRIGGER_SHORTCUT_KEY,
    (e) => {
      e.preventDefault();
      handleSlashCommand();
    },
    { enabled: !!editor, preventDefault: true },
    [handleSlashCommand, editor],
  );

  const label = "Insert slash command";
  const shortcutKeys = isMac() ? "Cmd+/" : "Ctrl+/";

  return {
    isVisible,
    canInsert,
    handleSlashCommand,
    label,
    shortcutKeys,
    trigger,
    Icon: PlusIcon,
  };
}
