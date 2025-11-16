// src/components/folder/FolderButton.tsx
"use client"

import * as React from "react"
import { FolderDialog } from "@/features/folder-dialog/components/folder-dialog"
import type { CategoryType } from "@/features/folder-dialog/schema/zod-schema"

type Props = {
  parent: CategoryType
}

export function FolderButton({ parent }: Props) {
  return <FolderDialog parent={parent} />
}
