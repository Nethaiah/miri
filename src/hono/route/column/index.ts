import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/index";
import { board, kanbanColumn } from "@/db/schema";
import { and, eq, asc, gt, lt } from "drizzle-orm";
import { auth } from "@/lib/auth";

const columnCreateSchema = z.object({
  boardId: z.uuid(),
  name: z.string().min(1).max(100),
});

const columnUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  order: z.number().int().min(0).optional(),
});

const columnReorderSchema = z.object({
  columns: z.array(z.object({
    id: z.uuid(),
    order: z.number().int().min(0),
  })),
});

const columns = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// List columns for a board
columns.get("/", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const boardId = c.req.query("boardId");
    if (!boardId) {
      return c.json({ error: "boardId is required" }, 400);
    }

    // Verify board belongs to user
    const [existingBoard] = await db
      .select()
      .from(board)
      .where(and(eq(board.id, boardId), eq(board.userId, user.id)))
      .limit(1);

    if (!existingBoard) {
      return c.json({ error: "Board not found" }, 404);
    }

    const columnsList = await db
      .select()
      .from(kanbanColumn)
      .where(eq(kanbanColumn.boardId, boardId))
      .orderBy(asc(kanbanColumn.order));

    return c.json({ columns: columnsList }, 200);
  } catch (error: any) {
    console.error("List columns error:", error);
    return c.json({ error: error?.message || "Failed to fetch columns" }, 500);
  }
});

// Create a new column
columns.post("/", zValidator("json", columnCreateSchema), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const data = c.req.valid("json");

    // Verify board belongs to user
    const [existingBoard] = await db
      .select()
      .from(board)
      .where(and(eq(board.id, data.boardId), eq(board.userId, user.id)))
      .limit(1);

    if (!existingBoard) {
      return c.json({ error: "Board not found" }, 404);
    }

    // Get max order for existing columns
    const existingColumns = await db
      .select()
      .from(kanbanColumn)
      .where(eq(kanbanColumn.boardId, data.boardId))
      .orderBy(asc(kanbanColumn.order));

    const maxOrder = existingColumns.length > 0 
      ? Math.max(...existingColumns.map(c => c.order)) 
      : -1;

    const [newColumn] = await db
      .insert(kanbanColumn)
      .values({
        boardId: data.boardId,
        name: data.name,
        order: maxOrder + 1,
      })
      .returning();

    return c.json({ column: newColumn }, 201);
  } catch (error: any) {
    console.error("Create column error:", error);
    return c.json({ error: error?.message || "Failed to create column" }, 500);
  }
});

// Update a column
columns.put("/:id", zValidator("json", columnUpdateSchema), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");
    const data = c.req.valid("json");

    // Get column and verify ownership through board
    const [existingColumn] = await db
      .select()
      .from(kanbanColumn)
      .where(eq(kanbanColumn.id, id))
      .limit(1);

    if (!existingColumn) {
      return c.json({ error: "Column not found" }, 404);
    }

    const [columnBoard] = await db
      .select()
      .from(board)
      .where(and(eq(board.id, existingColumn.boardId), eq(board.userId, user.id)))
      .limit(1);

    if (!columnBoard) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const updateData: Partial<typeof kanbanColumn.$inferInsert> = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.order !== undefined) {
      updateData.order = data.order;
    }

    const [updatedColumn] = await db
      .update(kanbanColumn)
      .set(updateData)
      .where(eq(kanbanColumn.id, id))
      .returning();

    return c.json({ column: updatedColumn }, 200);
  } catch (error: any) {
    console.error("Update column error:", error);
    return c.json({ error: error?.message || "Failed to update column" }, 500);
  }
});

// Batch reorder columns
columns.put("/reorder", zValidator("json", columnReorderSchema), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const data = c.req.valid("json");

    // Update each column's order
    for (const col of data.columns) {
      await db
        .update(kanbanColumn)
        .set({ order: col.order })
        .where(eq(kanbanColumn.id, col.id));
    }

    return c.json({ message: "Columns reordered" }, 200);
  } catch (error: any) {
    console.error("Reorder columns error:", error);
    return c.json({ error: error?.message || "Failed to reorder columns" }, 500);
  }
});

// Delete a column
columns.delete("/:id", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");

    // Get column and verify ownership through board
    const [existingColumn] = await db
      .select()
      .from(kanbanColumn)
      .where(eq(kanbanColumn.id, id))
      .limit(1);

    if (!existingColumn) {
      return c.json({ error: "Column not found" }, 404);
    }

    const [columnBoard] = await db
      .select()
      .from(board)
      .where(and(eq(board.id, existingColumn.boardId), eq(board.userId, user.id)))
      .limit(1);

    if (!columnBoard) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    await db.delete(kanbanColumn).where(eq(kanbanColumn.id, id));

    return c.json({ message: "Column deleted successfully" }, 200);
  } catch (error: any) {
    console.error("Delete column error:", error);
    return c.json({ error: error?.message || "Failed to delete column" }, 500);
  }
});

export default columns;
