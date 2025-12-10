"use client"

import { useCallback, useEffect, useState } from "react"
import { type Editor } from "@tiptap/react"
import { useHotkeys } from "react-hotkeys-hook"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Icons ---
import { AlignTopIcon } from "@/components/tiptap-icons/align-top-icon"
import { AlignBottomIcon } from "@/components/tiptap-icons/align-bottom-icon"

// --- Utils ---
import {
  type MoveNodeDirection,
  canMoveNode,
  moveNode as moveNodeUtil,
  shouldShowButton as shouldShowButtonUtil,
} from "./move-node-button-utils"

/**
 * Configuration for the move node functionality
 */
export interface UseMoveNodeConfig {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null
  /**
   * The direction to move the node ("up" or "down").
   */
  direction: MoveNodeDirection
  /**
   * Whether the button should hide when moving is not available.
   * @default false
   */
  hideWhenUnavailable?: boolean
  /**
   * Callback function called after a successful move.
   */
  onMoved?: (direction: MoveNodeDirection) => void
}

export const MOVE_NODE_SHORTCUT_KEYS: Record<MoveNodeDirection, string> = {
  up: "mod+shift+ArrowUp",
  down: "mod+shift+ArrowDown",
}

export const moveNodeLabels: Record<MoveNodeDirection, string> = {
  up: "Move Up",
  down: "Move Down",
}

export const moveNodeIcons = {
  up: AlignTopIcon,
  down: AlignBottomIcon,
}

/**
 * Custom hook that provides move node functionality for Tiptap editor
 *
 * @example
 * ```tsx
 * // Simple usage
 * function MySimpleMoveUpButton() {
 *   const { isVisible, handleMoveNode } = useMoveNode({ direction: "up" })
 *
 *   if (!isVisible) return null
 *
 *   return <button onClick={handleMoveNode}>Move Up</button>
 * }
 *
 * // Advanced usage with configuration
 * function MyAdvancedMoveDownButton() {
 *   const { isVisible, handleMoveNode, label, Icon } = useMoveNode({
 *     editor: myEditor,
 *     direction: "down",
 *     hideWhenUnavailable: true,
 *     onMoved: (direction) => console.log(`Node moved ${direction}!`)
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <button onClick={handleMoveNode} aria-label={label}>
 *       <Icon />
 *       {label}
 *     </button>
 *   )
 * }
 * ```
 */
export function useMoveNode(config: UseMoveNodeConfig) {
  const {
    editor: providedEditor,
    direction,
    hideWhenUnavailable = false,
    onMoved,
  } = config

  const { editor } = useTiptapEditor(providedEditor)
  const [isVisible, setIsVisible] = useState<boolean>(true)
  const [canMove, setCanMove] = useState<boolean>(false)

  useEffect(() => {
    if (!editor) return

    const handleUpdate = () => {
      setIsVisible(
        shouldShowButtonUtil({ editor, direction, hideWhenUnavailable })
      )
      setCanMove(canMoveNode(editor, direction))
    }

    handleUpdate()

    editor.on("transaction", handleUpdate)
    editor.on("selectionUpdate", handleUpdate)

    return () => {
      editor.off("transaction", handleUpdate)
      editor.off("selectionUpdate", handleUpdate)
    }
  }, [editor, hideWhenUnavailable, direction])

  const handleMoveNode = useCallback(() => {
    if (!editor) return false

    const success = moveNodeUtil(editor, direction)
    if (success) {
      onMoved?.(direction)
    }
    return success
  }, [editor, direction, onMoved])

  // Keyboard shortcut
  useHotkeys(
    MOVE_NODE_SHORTCUT_KEYS[direction],
    (e) => {
      e.preventDefault()
      handleMoveNode()
    },
    {
      enabled: canMove && !!editor?.isEditable,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [handleMoveNode, canMove, editor]
  )

  return {
    isVisible,
    handleMoveNode,
    canMoveNode: canMove,
    label: moveNodeLabels[direction],
    shortcutKeys: MOVE_NODE_SHORTCUT_KEYS[direction],
    Icon: moveNodeIcons[direction],
  }
}
