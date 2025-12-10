"use client"

import type { Editor } from "@tiptap/react"
import { TextSelection, NodeSelection } from "@tiptap/pm/state"

export type MoveNodeDirection = "up" | "down"

/**
 * Gets the current top-level block node that should be moved
 * For nested structures (like list items inside lists), this returns the top-level container
 */
function getCurrentBlock(editor: Editor) {
  const { state } = editor
  const { selection } = state
  const { $from } = selection

  // For NodeSelection, get the selected node
  if (selection instanceof NodeSelection) {
    const depth = selection.$from.depth
    if (depth === 0) return null
    
    try {
      // Check if this node is at depth 1 (direct child of doc)
      if (depth === 1) {
        const pos = selection.$from.before(depth)
        return { node: selection.node, pos, depth }
      }
      
      // If nested deeper, find the ancestor at depth 1
      for (let d = depth; d > 0; d--) {
        if (d === 1) {
          const node = $from.node(d)
          const pos = $from.before(d)
          return { node, pos, depth: d }
        }
      }
    } catch {
      return null
    }
  }

  // For text selections, find the top-level block
  // We want to find the block that is a direct child of the document (depth = 1)
  // This ensures lists, code blocks, etc. are moved as a whole unit
  
  // Start from the current depth and work our way up
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth)
    
    // Skip the document node
    if (node.type.name === "doc") continue
    
    // We want blocks that are direct children of the document
    // In ProseMirror, direct children of doc are at depth 1
    if (depth === 1 && node.isBlock) {
      try {
        const pos = $from.before(depth)
        return { node, pos, depth }
      } catch {
        continue
      }
    }
  }

  return null
}

/**
 * Checks if a node can be moved in the specified direction
 */
export function canMoveNode(
  editor: Editor | null,
  direction: MoveNodeDirection
): boolean {
  if (!editor || !editor.isEditable) return false

  const block = getCurrentBlock(editor)
  if (!block) return false

  const { pos, depth } = block
  const { doc } = editor.state

  try {
    const $pos = doc.resolve(pos)
    
    // The parent depth is one level up from the block
    const parentDepth = depth - 1
    
    if (parentDepth < 0) return false
    
    const parent = $pos.node(parentDepth)
    if (!parent) return false
    
    // Get the index of this block within its parent
    const index = $pos.index(parentDepth)

    if (direction === "up") {
      return index > 0
    } else {
      // Check if we're at the last position
      if (index >= parent.childCount - 1) return false
      
      // Also check if all remaining siblings below are empty nodes
      // This prevents moving down infinitely into empty paragraphs
      for (let i = index + 1; i < parent.childCount; i++) {
        const sibling = parent.child(i)
        // If we find a non-empty sibling, we can move down
        if (sibling.textContent.trim() !== "") {
          return true
        }
      }
      
      // All siblings below are empty, don't allow moving down
      return false
    }
  } catch (error) {
    console.error("canMoveNode error:", error)
    return false
  }
}

/**
 * Moves the selected node or block in the specified direction
 */
export function moveNode(
  editor: Editor | null,
  direction: MoveNodeDirection
): boolean {
  if (!editor || !editor.isEditable) return false
  if (!canMoveNode(editor, direction)) return false

  const block = getCurrentBlock(editor)
  if (!block) return false

  const { node, pos, depth } = block
  const { state, view } = editor
  const { tr, doc } = state

  try {
    const $pos = doc.resolve(pos)
    const parentDepth = depth - 1
    
    if (parentDepth < 0) return false
    
    const parent = $pos.node(parentDepth)
    if (!parent) return false
    
    const index = $pos.index(parentDepth)

    // Get the target index
    const targetIndex = direction === "up" ? index - 1 : index + 1
    
    // Validate target index
    if (targetIndex < 0 || targetIndex >= parent.childCount) return false

    // Get current node size
    const nodeSize = node.nodeSize
    const fromPos = pos
    const toPos = pos + nodeSize

    // Calculate the position where we want to insert
    let targetPos: number
    
    if (direction === "up") {
      // Moving up: get position of previous sibling
      const prevSiblingStart = $pos.posAtIndex(targetIndex, parentDepth)
      targetPos = prevSiblingStart
    } else {
      // Moving down: get position after next sibling
      const nextSiblingStart = $pos.posAtIndex(targetIndex, parentDepth)
      const nextNode = parent.child(targetIndex)
      targetPos = nextSiblingStart + nextNode.nodeSize
    }

    // Create a slice of the content to move
    const slice = tr.doc.slice(fromPos, toPos)
    
    // Delete the node from its current position
    tr.delete(fromPos, toPos)
    
    // Adjust target position if we're moving down (deletion shifts positions)
    if (direction === "down") {
      targetPos -= nodeSize
    }
    
    // Insert the node at the target position
    tr.insert(targetPos, slice.content)

    // Calculate new cursor position
    const newPos = direction === "up" ? targetPos + 1 : targetPos + 1
    
    try {
      const $newPos = tr.doc.resolve(newPos)
      
      // Set selection based on original selection type
      if (state.selection instanceof NodeSelection) {
        // For node selections, try to select the moved node
        tr.setSelection(NodeSelection.create(tr.doc, targetPos))
      } else {
        // For text selections, place cursor inside the moved block
        tr.setSelection(TextSelection.near($newPos))
      }
    } catch {
      // If we can't set the selection, just leave it where it is
    }

    // Dispatch the transaction
    view.dispatch(tr.scrollIntoView())
    return true
    
  } catch (error) {
    console.error("Error moving node:", error)
    return false
  }
}

/**
 * Determines if the move button should be visible based on editor state and configuration
 */
export function shouldShowButton(props: {
  editor: Editor | null
  direction: MoveNodeDirection
  hideWhenUnavailable: boolean
}): boolean {
  const { editor, direction, hideWhenUnavailable } = props

  if (!editor || !editor.isEditable) return false

  if (hideWhenUnavailable) {
    return canMoveNode(editor, direction)
  }

  return true
}

