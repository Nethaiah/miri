import MainLayout from "@/components/layout/main-layout"
import { db } from "@/index"
import { board, kanbanColumn, kanbanCard } from "@/db/schema"
import { and, eq, asc } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { BoardEditor } from "@/features/board/components/board-editor"

type BoardPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { id } = await params
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect("/sign-in")
  }

  const user = session.user

  const [existingBoard] = await db
    .select()
    .from(board)
    .where(and(eq(board.id, id), eq(board.userId, user.id)))
    .limit(1)

  if (!existingBoard) {
    notFound()
  }

  // Fetch columns
  const columns = await db
    .select()
    .from(kanbanColumn)
    .where(eq(kanbanColumn.boardId, id))
    .orderBy(asc(kanbanColumn.order))

  // Fetch all cards for this board's columns
  const columnIds = columns.map((c) => c.id)
  let cards: (typeof kanbanCard.$inferSelect)[] = []

  if (columnIds.length > 0) {
    for (const colId of columnIds) {
      const colCards = await db
        .select()
        .from(kanbanCard)
        .where(eq(kanbanCard.columnId, colId))
        .orderBy(asc(kanbanCard.order))
      cards.push(...colCards)
    }
  }

  const breadcrumbItems = [
    { label: "Boards", href: "/dashboard" },
    { label: existingBoard.name || "Untitled" },
  ]

  return (
    <MainLayout breadcrumbItems={breadcrumbItems}>
      <BoardEditor
        id={existingBoard.id}
        name={existingBoard.name}
        description={existingBoard.description}
        initialColumns={columns}
        initialCards={cards}
      />
    </MainLayout>
  )
}
