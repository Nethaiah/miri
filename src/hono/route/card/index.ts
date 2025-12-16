import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/index";
import { board, kanbanColumn, kanbanCard } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";

const cardCreateSchema = z.object({
  columnId: z.string().uuid(),
  name: z.string().min(1).max(500),
  description: z.string().max(2000).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});

const cardUpdateSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  columnId: z.string().uuid().optional(),
  order: z.number().int().min(0).optional(),
});

const cardReorderSchema = z.object({
  cards: z.array(z.object({
    id: z.string().uuid(),
    columnId: z.string().uuid(),
    order: z.number().int().min(0),
  })),
});

const cards = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// Helper to verify column ownership through board
async function verifyColumnOwnership(columnId: string, userId: string) {
  const [column] = await db
    .select()
    .from(kanbanColumn)
    .where(eq(kanbanColumn.id, columnId))
    .limit(1);

  if (!column) return null;

  const [columnBoard] = await db
    .select()
    .from(board)
    .where(and(eq(board.id, column.boardId), eq(board.userId, userId)))
    .limit(1);

  return columnBoard ? column : null;
}

// List cards for a column
cards.get("/", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const columnId = c.req.query("columnId");
    if (!columnId) {
      return c.json({ error: "columnId is required" }, 400);
    }

    const column = await verifyColumnOwnership(columnId, user.id);
    if (!column) {
      return c.json({ error: "Column not found" }, 404);
    }

    const cardsList = await db
      .select()
      .from(kanbanCard)
      .where(eq(kanbanCard.columnId, columnId))
      .orderBy(asc(kanbanCard.order));

    return c.json({ cards: cardsList }, 200);
  } catch (error: any) {
    console.error("List cards error:", error);
    return c.json({ error: error?.message || "Failed to fetch cards" }, 500);
  }
});

// Create a new card
cards.post("/", zValidator("json", cardCreateSchema), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const data = c.req.valid("json");

    const column = await verifyColumnOwnership(data.columnId, user.id);
    if (!column) {
      return c.json({ error: "Column not found" }, 404);
    }

    // Get max order for existing cards in column
    const existingCards = await db
      .select()
      .from(kanbanCard)
      .where(eq(kanbanCard.columnId, data.columnId))
      .orderBy(asc(kanbanCard.order));

    const maxOrder = existingCards.length > 0 
      ? Math.max(...existingCards.map(c => c.order)) 
      : -1;

    const [newCard] = await db
      .insert(kanbanCard)
      .values({
        columnId: data.columnId,
        name: data.name,
        description: data.description ?? null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        order: maxOrder + 1,
      })
      .returning();

    return c.json({ card: newCard }, 201);
  } catch (error: any) {
    console.error("Create card error:", error);
    return c.json({ error: error?.message || "Failed to create card" }, 500);
  }
});

// Update a card
cards.put("/:id", zValidator("json", cardUpdateSchema), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");
    const data = c.req.valid("json");

    // Get card
    const [existingCard] = await db
      .select()
      .from(kanbanCard)
      .where(eq(kanbanCard.id, id))
      .limit(1);

    if (!existingCard) {
      return c.json({ error: "Card not found" }, 404);
    }

    // Verify ownership through column
    const column = await verifyColumnOwnership(existingCard.columnId, user.id);
    if (!column) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // If moving to new column, verify ownership of target column
    if (data.columnId && data.columnId !== existingCard.columnId) {
      const targetColumn = await verifyColumnOwnership(data.columnId, user.id);
      if (!targetColumn) {
        return c.json({ error: "Target column not found" }, 404);
      }
    }

    const updateData: Partial<typeof kanbanCard.$inferInsert> = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.description !== undefined) {
      updateData.description = data.description ?? null;
    }

    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    if (data.columnId !== undefined) {
      updateData.columnId = data.columnId;
    }

    if (data.order !== undefined) {
      updateData.order = data.order;
    }

    const [updatedCard] = await db
      .update(kanbanCard)
      .set(updateData)
      .where(eq(kanbanCard.id, id))
      .returning();

    return c.json({ card: updatedCard }, 200);
  } catch (error: any) {
    console.error("Update card error:", error);
    return c.json({ error: error?.message || "Failed to update card" }, 500);
  }
});

// Batch reorder/move cards (for drag and drop)
cards.put("/reorder", zValidator("json", cardReorderSchema), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const data = c.req.valid("json");

    // Update each card's position
    for (const card of data.cards) {
      await db
        .update(kanbanCard)
        .set({ 
          columnId: card.columnId,
          order: card.order 
        })
        .where(eq(kanbanCard.id, card.id));
    }

    return c.json({ message: "Cards reordered" }, 200);
  } catch (error: any) {
    console.error("Reorder cards error:", error);
    return c.json({ error: error?.message || "Failed to reorder cards" }, 500);
  }
});

// Delete a card
cards.delete("/:id", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");

    // Get card
    const [existingCard] = await db
      .select()
      .from(kanbanCard)
      .where(eq(kanbanCard.id, id))
      .limit(1);

    if (!existingCard) {
      return c.json({ error: "Card not found" }, 404);
    }

    // Verify ownership through column
    const column = await verifyColumnOwnership(existingCard.columnId, user.id);
    if (!column) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    await db.delete(kanbanCard).where(eq(kanbanCard.id, id));

    return c.json({ message: "Card deleted successfully" }, 200);
  } catch (error: any) {
    console.error("Delete card error:", error);
    return c.json({ error: error?.message || "Failed to delete card" }, 500);
  }
});

export default cards;
