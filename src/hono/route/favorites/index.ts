import { Hono } from "hono";
import { db } from "@/index";
import { note, board, folder } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

const favorites = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// GET /api/favorites - Get all favorited notes and boards
favorites.get("/", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get favorited notes with their folder info
    const favoritedNotes = await db
      .select({
        id: note.id,
        title: note.title,
        description: note.description,
        folderId: note.folderId,
        updatedAt: note.updatedAt,
        createdAt: note.createdAt,
        pinned: note.pinned,
        favorited: note.favorited,
      })
      .from(note)
      .where(and(eq(note.userId, user.id), eq(note.favorited, true)));

    // Get favorited boards
    const favoritedBoards = await db
      .select({
        id: board.id,
        name: board.name,
        description: board.description,
        updatedAt: board.updatedAt,
        createdAt: board.createdAt,
        pinned: board.pinned,
        favorited: board.favorited,
      })
      .from(board)
      .where(and(eq(board.userId, user.id), eq(board.favorited, true)));

    // Format and combine into a single array with type discriminator
    const favorites = [
      ...favoritedNotes.map((n) => ({
        ...n,
        type: "note" as const,
        name: n.title, // Normalize title to name
      })),
      ...favoritedBoards.map((b) => ({
        ...b,
        type: "board" as const,
      })),
    ];

    return c.json({ favorites }, 200);
  } catch (error: any) {
    console.error("Get favorites error:", error);
    return c.json({ error: error?.message || "Failed to fetch favorites" }, 500);
  }
});

export default favorites;
