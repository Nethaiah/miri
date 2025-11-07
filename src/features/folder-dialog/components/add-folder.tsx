// src/components/folder/FolderButton.tsx
"use client"

import * as React from "react"
import { FolderDialog } from "@/features/folder-dialog/components/folder-dialog"

type Props = {
  parent: string
  onCreate?: (payload: { parent: string; name: string; emoji: string }) => void
}

export function FolderButton({ parent, onCreate }: Props) {
  return <FolderDialog parent={parent} onCreate={onCreate} />
}
