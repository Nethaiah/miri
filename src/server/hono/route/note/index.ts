import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@/index";
import { note, folder } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { noteCreateSchema, noteUpdateSchema } from "@/features/note/schema/note-schema";

const notes = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

notes.get("/", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const folderId = c.req.query("folderId");

    const where = folderId
      ? and(eq(note.userId, user.id), eq(note.folderId, folderId))
      : eq(note.userId, user.id);

    const notesList = await db
      .select()
      .from(note)
      .where(where)
      .orderBy(desc(note.createdAt));

    return c.json({ notes: notesList }, 200);
  } catch (error: any) {
    console.error("List notes error:", error);
    return c.json({ error: error?.message || "Failed to fetch notes" }, 500);
  }
});

notes.post("/", zValidator("json", noteCreateSchema), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const data = c.req.valid("json");
    const { folderId, title, description, content } = data;

    const [existingFolder] = await db
      .select()
      .from(folder)
      .where(and(eq(folder.id, folderId), eq(folder.userId, user.id)))
      .limit(1);

    if (!existingFolder) {
      return c.json({ error: "Folder not found" }, 404);
    }

    const [newNote] = await db
      .insert(note)
      .values({
        userId: user.id,
        folderId,
        title: title && title.length > 0 ? title : "New Notes",
        description: description ?? null,
        content: content ?? "",
      })
      .returning();

    return c.json({ note: newNote }, 201);
  } catch (error: any) {
    console.error("Create note error:", error);
    return c.json({ error: error?.message || "Failed to create note" }, 500);
  }
});

notes.delete("/:id", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");

    const [existingNote] = await db
      .select()
      .from(note)
      .where(and(eq(note.id, id), eq(note.userId, user.id)))
      .limit(1);

    if (!existingNote) {
      return c.json({ error: "Note not found" }, 404);
    }

    await db.delete(note).where(and(eq(note.id, id), eq(note.userId, user.id)));

    return c.json({ message: "Note deleted successfully" }, 200);
  } catch (error: any) {
    console.error("Delete note error:", error);
    return c.json({ error: error?.message || "Failed to delete note" }, 500);
  }
});

notes.get("/:id", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");

    const [existingNote] = await db
      .select()
      .from(note)
      .where(and(eq(note.id, id), eq(note.userId, user.id)))
      .limit(1);

    if (!existingNote) {
      return c.json({ error: "Note not found" }, 404);
    }

    return c.json({ note: existingNote }, 200);
  } catch (error: any) {
    console.error("Get note error:", error);
    return c.json({ error: error?.message || "Failed to fetch note" }, 500);
  }
});

notes.put("/:id", zValidator("json", noteUpdateSchema), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");
    const data = c.req.valid("json");

    const [existingNote] = await db
      .select()
      .from(note)
      .where(and(eq(note.id, id), eq(note.userId, user.id)))
      .limit(1);

    if (!existingNote) {
      return c.json({ error: "Note not found" }, 404);
    }

    const updateData: Partial<typeof note.$inferInsert> = {};

    if (data.title !== undefined) {
      updateData.title = data.title && data.title.length > 0 ? data.title : "New Notes";
    }

    if (data.description !== undefined) {
      updateData.description = data.description ?? null;
    }

    if (data.content !== undefined) {
      updateData.content = data.content ?? "";
    }

    const [updatedNote] = await db
      .update(note)
      .set(updateData)
      .where(and(eq(note.id, id), eq(note.userId, user.id)))
      .returning();

    return c.json({ note: updatedNote }, 200);
  } catch (error: any) {
    console.error("Update note error:", error);
    return c.json({ error: error?.message || "Failed to update note" }, 500);
  }
});

export default notes;
