import MainLayout from "@/components/layout/main-layout"
import { db } from "@/index"
import { folder, note } from "@/db/schema"
import { and, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { NoteEditor } from "@/features/note/components/note-editor"

type NotePageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function NotePage({ params }: NotePageProps) {
  const { id } = await params
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect("/sign-in")
  }

  const user = session.user

  const [existingNote] = await db
    .select()
    .from(note)
    .where(eq(note.id, id))
    .limit(1)

  if (!existingNote) {
    notFound()
  }

  const [noteFolder] = await db
    .select()
    .from(folder)
    .where(and(eq(folder.id, existingNote.folderId), eq(folder.userId, user.id)))
    .limit(1)

  const breadcrumbItems = [
    { label: "Folders", href: "/folders" },
    noteFolder
      ? { label: noteFolder.name, href: `/folder/${noteFolder.id}` }
      : { label: "Folder" },
    { label: existingNote.title || "New Notes" },
  ]

  return (
    <MainLayout breadcrumbItems={breadcrumbItems}>
      <NoteEditor
        id={existingNote.id}
        title={existingNote.title}
        description={existingNote.description}
        content={existingNote.content}
      />
    </MainLayout>
  )
}
