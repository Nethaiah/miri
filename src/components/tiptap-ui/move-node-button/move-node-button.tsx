"use client"

import { forwardRef, useCallback } from "react"

// --- Lib ---
import { parseShortcutKeys } from "@/lib/tiptap-utils"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Tiptap UI ---
import type { MoveNodeDirection } from "./move-node-button-utils"
import type { UseMoveNodeConfig } from "./use-move-node"
import { MOVE_NODE_SHORTCUT_KEYS, useMoveNode } from "./use-move-node"

// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button } from "@/components/tiptap-ui-primitive/button"
import { Badge } from "@/components/tiptap-ui-primitive/badge"

export interface MoveNodeButtonProps
  extends Omit<ButtonProps, "type">,
    UseMoveNodeConfig {
  /**
   * Optional text to display alongside the icon.
   */
  text?: string
  /**
   * Optional show shortcut keys in the button.
   * @default false
   */
  showShortcut?: boolean
}

export function MoveNodeShortcutBadge({
  direction,
  shortcutKeys = MOVE_NODE_SHORTCUT_KEYS[direction],
}: {
  direction: MoveNodeDirection
  shortcutKeys?: string
}) {
  return <Badge>{parseShortcutKeys({ shortcutKeys })}</Badge>
}

/**
 * Button component for moving nodes up or down in a Tiptap editor.
 *
 * For custom button implementations, use the `useMoveNode` hook instead.
 */
export const MoveNodeButton = forwardRef<
  HTMLButtonElement,
  MoveNodeButtonProps
>(
  (
    {
      editor: providedEditor,
      direction,
      text,
      hideWhenUnavailable = false,
      onMoved,
      showShortcut = false,
      onClick,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const { editor } = useTiptapEditor(providedEditor)
    const {
      isVisible,
      handleMoveNode,
      label,
      canMoveNode,
      Icon,
      shortcutKeys,
    } = useMoveNode({
      editor,
      direction,
      hideWhenUnavailable,
      onMoved,
    })

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        handleMoveNode()
      },
      [handleMoveNode, onClick]
    )

    if (!isVisible) {
      return null
    }

    return (
      <Button
        type="button"
        disabled={!canMoveNode}
        data-style="ghost"
        data-disabled={!canMoveNode}
        role="button"
        tabIndex={-1}
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
              <MoveNodeShortcutBadge
                direction={direction}
                shortcutKeys={shortcutKeys}
              />
            )}
          </>
        )}
      </Button>
    )
  }
)

MoveNodeButton.displayName = "MoveNodeButton"
