// src/components/folder/FolderButton.tsx
"use client"

import * as React from "react"
import { FolderDialog } from "@/features/folder-dialog/components/folder-dialog"

type Props = {
  parent: "Notes" | "Journals" | "Kanbans"
}

export function FolderButton({ parent }: Props) {
  return <FolderDialog parent={parent} />
}
