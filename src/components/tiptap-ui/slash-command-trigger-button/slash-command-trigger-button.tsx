"use client";

import { forwardRef, useCallback } from "react";

// --- Hooks ---
import {
  useSlashCommandTrigger,
  type UseSlashCommandTriggerConfig,
} from "./use-slash-command-trigger";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

// --- Lib ---
import { parseShortcutKeys } from "@/lib/tiptap-utils";

// --- UI Primitives ---
import {
  Button,
  type ButtonProps,
} from "@/components/tiptap-ui-primitive/button";
import { Badge } from "@/components/tiptap-ui-primitive/badge";

export interface SlashCommandTriggerButtonProps
  extends Omit<ButtonProps, "type">,
    UseSlashCommandTriggerConfig {
  /**
   * Optional text to display alongside the icon.
   */
  text?: string;
  /**
   * Optional show shortcut keys in the button.
   * @default false
   */
  showShortcut?: boolean;
}

export const SlashCommandTriggerButton = forwardRef<
  HTMLButtonElement,
  SlashCommandTriggerButtonProps
>(
  (
    {
      editor: providedEditor,
      text,
      trigger = "/",
      hideWhenUnavailable = false,
      onTriggered,
      showShortcut = false,
      onClick,
      children,
      node,
      nodePos,
      ...buttonProps
    },
    ref,
  ) => {
    const { editor } = useTiptapEditor(providedEditor);
    const {
      isVisible,
      canInsert,
      handleSlashCommand,
      label,
      shortcutKeys,
      Icon,
    } = useSlashCommandTrigger({
      editor,
      trigger,
      hideWhenUnavailable,
      node,
      nodePos,
      onTriggered,
    });

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        handleSlashCommand();
      },
      [handleSlashCommand, onClick],
    );

    if (!isVisible) {
      return null;
    }

    return (
      <Button
        type="button"
        data-style="ghost"
        role="button"
        tabIndex={-1}
        disabled={!canInsert}
        data-disabled={!canInsert}
        aria-label={label}
        tooltip={label}
        onClick={handleClick}
        {...buttonProps}
        ref={ref}
      >
        {children ?? (
          <>
            <Icon className="tiptap-button-icon" />
            {text && <span className="tiptap-button-text">{text}</span>}
            {showShortcut && (
              <Badge>{parseShortcutKeys({ shortcutKeys })}</Badge>
            )}
          </>
        )}
      </Button>
    );
  },
);

SlashCommandTriggerButton.displayName = "SlashCommandTriggerButton";
