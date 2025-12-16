import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/index";
import { calendarEvent, kanbanCard, kanbanColumn, board, note } from "@/db/schema";
import { and, eq, gte, lte, or } from "drizzle-orm";
import { auth } from "@/lib/auth";

const eventCreateSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional().nullable(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  color: z.string().max(50).optional().nullable(),
  noteId: z.string().uuid().optional().nullable(),
});

const eventUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional().nullable(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  color: z.string().max(50).optional().nullable(),
  noteId: z.string().uuid().optional().nullable(),
});

const calendar = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// List calendar events (with optional date range filter)
// Also includes kanban card due dates
calendar.get("/", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");

    // Build query conditions
    const conditions = [eq(calendarEvent.userId, user.id)];
    
    if (startDate) {
      conditions.push(gte(calendarEvent.endAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(calendarEvent.startAt, new Date(endDate)));
    }

    // Get calendar events
    const events = await db
      .select()
      .from(calendarEvent)
      .where(and(...conditions));

    // Get kanban cards with due dates from user's boards
    let kanbanDueDates: any[] = [];
    if (!startDate || !endDate) {
      // If no date filter, get all cards with due dates
      kanbanDueDates = await db
        .select({
          id: kanbanCard.id,
          name: kanbanCard.name,
          dueDate: kanbanCard.dueDate,
          columnName: kanbanColumn.name,
          boardName: board.name,
          boardId: board.id,
        })
        .from(kanbanCard)
        .innerJoin(kanbanColumn, eq(kanbanCard.columnId, kanbanColumn.id))
        .innerJoin(board, eq(kanbanColumn.boardId, board.id))
        .where(and(
          eq(board.userId, user.id),
          kanbanCard.dueDate // Only cards with due dates
        ));
    } else {
      // Filter by date range
      kanbanDueDates = await db
        .select({
          id: kanbanCard.id,
          name: kanbanCard.name,
          dueDate: kanbanCard.dueDate,
          columnName: kanbanColumn.name,
          boardName: board.name,
          boardId: board.id,
        })
        .from(kanbanCard)
        .innerJoin(kanbanColumn, eq(kanbanCard.columnId, kanbanColumn.id))
        .innerJoin(board, eq(kanbanColumn.boardId, board.id))
        .where(and(
          eq(board.userId, user.id),
          gte(kanbanCard.dueDate, new Date(startDate)),
          lte(kanbanCard.dueDate, new Date(endDate))
        ));
    }

    return c.json({ events, kanbanDueDates }, 200);
  } catch (error: any) {
    console.error("List calendar events error:", error);
    return c.json({ error: error?.message || "Failed to fetch calendar events" }, 500);
  }
});

// Create a new calendar event
calendar.post("/", zValidator("json", eventCreateSchema), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const data = c.req.valid("json");

    // If noteId provided, verify ownership
    if (data.noteId) {
      const [existingNote] = await db
        .select()
        .from(note)
        .where(and(eq(note.id, data.noteId), eq(note.userId, user.id)))
        .limit(1);

      if (!existingNote) {
        return c.json({ error: "Note not found" }, 404);
      }
    }

    const [newEvent] = await db
      .insert(calendarEvent)
      .values({
        userId: user.id,
        title: data.title,
        description: data.description ?? null,
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        color: data.color ?? null,
        noteId: data.noteId ?? null,
      })
      .returning();

    return c.json({ event: newEvent }, 201);
  } catch (error: any) {
    console.error("Create calendar event error:", error);
    return c.json({ error: error?.message || "Failed to create calendar event" }, 500);
  }
});

// Get a single calendar event
calendar.get("/:id", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");

    const [event] = await db
      .select()
      .from(calendarEvent)
      .where(and(eq(calendarEvent.id, id), eq(calendarEvent.userId, user.id)))
      .limit(1);

    if (!event) {
      return c.json({ error: "Event not found" }, 404);
    }

    return c.json({ event }, 200);
  } catch (error: any) {
    console.error("Get calendar event error:", error);
    return c.json({ error: error?.message || "Failed to fetch calendar event" }, 500);
  }
});

// Update a calendar event
calendar.put("/:id", zValidator("json", eventUpdateSchema), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");
    const data = c.req.valid("json");

    // Verify ownership
    const [existingEvent] = await db
      .select()
      .from(calendarEvent)
      .where(and(eq(calendarEvent.id, id), eq(calendarEvent.userId, user.id)))
      .limit(1);

    if (!existingEvent) {
      return c.json({ error: "Event not found" }, 404);
    }

    // If noteId provided, verify ownership
    if (data.noteId) {
      const [existingNote] = await db
        .select()
        .from(note)
        .where(and(eq(note.id, data.noteId), eq(note.userId, user.id)))
        .limit(1);

      if (!existingNote) {
        return c.json({ error: "Note not found" }, 404);
      }
    }

    const updateData: Partial<typeof calendarEvent.$inferInsert> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description ?? null;
    if (data.startAt !== undefined) updateData.startAt = new Date(data.startAt);
    if (data.endAt !== undefined) updateData.endAt = new Date(data.endAt);
    if (data.color !== undefined) updateData.color = data.color ?? null;
    if (data.noteId !== undefined) updateData.noteId = data.noteId ?? null;

    const [updatedEvent] = await db
      .update(calendarEvent)
      .set(updateData)
      .where(eq(calendarEvent.id, id))
      .returning();

    return c.json({ event: updatedEvent }, 200);
  } catch (error: any) {
    console.error("Update calendar event error:", error);
    return c.json({ error: error?.message || "Failed to update calendar event" }, 500);
  }
});

// Delete a calendar event
calendar.delete("/:id", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");

    // Verify ownership
    const [existingEvent] = await db
      .select()
      .from(calendarEvent)
      .where(and(eq(calendarEvent.id, id), eq(calendarEvent.userId, user.id)))
      .limit(1);

    if (!existingEvent) {
      return c.json({ error: "Event not found" }, 404);
    }

    await db.delete(calendarEvent).where(eq(calendarEvent.id, id));

    return c.json({ message: "Event deleted successfully" }, 200);
  } catch (error: any) {
    console.error("Delete calendar event error:", error);
    return c.json({ error: error?.message || "Failed to delete calendar event" }, 500);
  }
});

export default calendar;
