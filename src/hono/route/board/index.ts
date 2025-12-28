import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/index";
import { board, kanbanColumn, kanbanCard } from "@/db/schema";
import { and, eq, desc, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";

const boardCreateSchema = z.object({
  name: z.string().max(200).optional(),
  description: z.string().max(500).optional().nullable(),
});

const boardUpdateSchema = z.object({
  name: z.string().max(200).optional(),
  description: z.string().max(500).optional().nullable(),
});

const boards = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// List all boards for user
boards.get("/", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const boardsList = await db
      .select()
      .from(board)
      .where(eq(board.userId, user.id))
      .orderBy(desc(board.createdAt));

    return c.json({ boards: boardsList }, 200);
  } catch (error: any) {
    console.error("List boards error:", error);
    return c.json({ error: error?.message || "Failed to fetch boards" }, 500);
  }
});

// Create a new board with default columns
boards.post("/", zValidator("json", boardCreateSchema), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const data = c.req.valid("json");

    const [newBoard] = await db
      .insert(board)
      .values({
        userId: user.id,
        name: data.name && data.name.length > 0 ? data.name : "Untitled",
        description: data.description ?? null,
      })
      .returning();

    // Create default columns for the new board
    const defaultColumns = [
      { name: "Todo", order: 0 },
      { name: "In Progress", order: 1 },
      { name: "Done", order: 2 },
    ];

    await db.insert(kanbanColumn).values(
      defaultColumns.map((col) => ({
        boardId: newBoard.id,
        name: col.name,
        order: col.order,
      }))
    );

    return c.json({ board: newBoard }, 201);
  } catch (error: any) {
    console.error("Create board error:", error);
    return c.json({ error: error?.message || "Failed to create board" }, 500);
  }
});

// PATCH /api/boards/:id/pin - Toggle pin status
// IMPORTANT: Must come BEFORE GET /:id for proper route matching
boards.patch("/:id/pin", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");

    const [existingBoard] = await db
      .select()
      .from(board)
      .where(and(eq(board.id, id), eq(board.userId, user.id)))
      .limit(1);

    if (!existingBoard) {
      return c.json({ error: "Board not found" }, 404);
    }

    const [updatedBoard] = await db
      .update(board)
      .set({ pinned: !existingBoard.pinned })
      .where(and(eq(board.id, id), eq(board.userId, user.id)))
      .returning();

    return c.json({ board: updatedBoard }, 200);
  } catch (error: any) {
    console.error("Toggle board pin error:", error);
    return c.json({ error: error?.message || "Failed to toggle board pin" }, 500);
  }
});

// PATCH /api/boards/:id/favorite - Toggle favorite status
boards.patch("/:id/favorite", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");

    const [existingBoard] = await db
      .select()
      .from(board)
      .where(and(eq(board.id, id), eq(board.userId, user.id)))
      .limit(1);

    if (!existingBoard) {
      return c.json({ error: "Board not found" }, 404);
    }

    const [updatedBoard] = await db
      .update(board)
      .set({ favorited: !existingBoard.favorited })
      .where(and(eq(board.id, id), eq(board.userId, user.id)))
      .returning();

    return c.json({ board: updatedBoard }, 200);
  } catch (error: any) {
    console.error("Toggle board favorite error:", error);
    return c.json({ error: error?.message || "Failed to toggle board favorite" }, 500);
  }
});

// POST /api/boards/:id/duplicate - Duplicate a board
boards.post("/:id/duplicate", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");

    // Get the original board
    const [originalBoard] = await db
      .select()
      .from(board)
      .where(and(eq(board.id, id), eq(board.userId, user.id)))
      .limit(1);

    if (!originalBoard) {
      return c.json({ error: "Board not found" }, 404);
    }

    // Create new board with copied data
    const [newBoard] = await db
      .insert(board)
      .values({
        userId: user.id,
        name: `${originalBoard.name} (Copy)`,
        description: originalBoard.description,
        pinned: false,
        favorited: false,
      })
      .returning();

    // Get original columns
    const originalColumns = await db
      .select()
      .from(kanbanColumn)
      .where(eq(kanbanColumn.boardId, id))
      .orderBy(asc(kanbanColumn.order));

    // Duplicate columns and cards
    for (const originalColumn of originalColumns) {
      const [newColumn] = await db
        .insert(kanbanColumn)
        .values({
          boardId: newBoard.id,
          name: originalColumn.name,
          color: originalColumn.color,
          order: originalColumn.order,
        })
        .returning();

      const originalCards = await db
        .select()
        .from(kanbanCard)
        .where(eq(kanbanCard.columnId, originalColumn.id))
        .orderBy(asc(kanbanCard.order));

      if (originalCards.length > 0) {
        await db.insert(kanbanCard).values(
          originalCards.map((card) => ({
            columnId: newColumn.id,
            name: card.name,
            description: card.description,
            dueDate: card.dueDate,
            order: card.order,
          }))
        );
      }
    }

    return c.json({ board: newBoard }, 201);
  } catch (error: any) {
    console.error("Duplicate board error:", error);
    return c.json({ error: error?.message || "Failed to duplicate board" }, 500);
  }
});

// Get board with columns and cards
boards.get("/:id", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");

    const [existingBoard] = await db
      .select()
      .from(board)
      .where(and(eq(board.id, id), eq(board.userId, user.id)))
      .limit(1);

    if (!existingBoard) {
      return c.json({ error: "Board not found" }, 404);
    }

    // Get columns for this board
    const columns = await db
      .select()
      .from(kanbanColumn)
      .where(eq(kanbanColumn.boardId, id))
      .orderBy(asc(kanbanColumn.order));

    // Get all cards for all columns
    const columnIds = columns.map((col) => col.id);
    let cards: typeof kanbanCard.$inferSelect[] = [];
    
    if (columnIds.length > 0) {
      cards = await db
        .select()
        .from(kanbanCard)
        .where(
          columnIds.length === 1
            ? eq(kanbanCard.columnId, columnIds[0])
            : eq(kanbanCard.columnId, columnIds[0]) // Will be overwritten by loop below
        )
        .orderBy(asc(kanbanCard.order));

      // Actually fetch cards for all columns
      cards = [];
      for (const colId of columnIds) {
        const colCards = await db
          .select()
          .from(kanbanCard)
          .where(eq(kanbanCard.columnId, colId))
          .orderBy(asc(kanbanCard.order));
        cards.push(...colCards);
      }
    }

    return c.json({ 
      board: existingBoard, 
      columns, 
      cards 
    }, 200);
  } catch (error: any) {
    console.error("Get board error:", error);
    return c.json({ error: error?.message || "Failed to fetch board" }, 500);
  }
});

// Update board
boards.put("/:id", zValidator("json", boardUpdateSchema), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");
    const data = c.req.valid("json");

    const [existingBoard] = await db
      .select()
      .from(board)
      .where(and(eq(board.id, id), eq(board.userId, user.id)))
      .limit(1);

    if (!existingBoard) {
      return c.json({ error: "Board not found" }, 404);
    }

    const updateData: Partial<typeof board.$inferInsert> = {};

    if (data.name !== undefined) {
      updateData.name = data.name && data.name.length > 0 ? data.name : "Untitled";
    }

    if (data.description !== undefined) {
      updateData.description = data.description ?? null;
    }

    const [updatedBoard] = await db
      .update(board)
      .set(updateData)
      .where(and(eq(board.id, id), eq(board.userId, user.id)))
      .returning();

    return c.json({ board: updatedBoard }, 200);
  } catch (error: any) {
    console.error("Update board error:", error);
    return c.json({ error: error?.message || "Failed to update board" }, 500);
  }
});

// Delete board (cascades to columns and cards)
boards.delete("/:id", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");

    const [existingBoard] = await db
      .select()
      .from(board)
      .where(and(eq(board.id, id), eq(board.userId, user.id)))
      .limit(1);

    if (!existingBoard) {
      return c.json({ error: "Board not found" }, 404);
    }

    await db.delete(board).where(and(eq(board.id, id), eq(board.userId, user.id)));

    return c.json({ message: "Board deleted successfully" }, 200);
  } catch (error: any) {
    console.error("Delete board error:", error);
    return c.json({ error: error?.message || "Failed to delete board" }, 500);
  }
});

export default boards;
