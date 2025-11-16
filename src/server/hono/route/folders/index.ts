import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/index";
import { folder } from "@/db/schema";
import { folderWithParentSchema } from "@/features/folder-dialog/schema/zod-schema";
import { eq, and, desc } from "drizzle-orm";
import { extractEmoji, removeEmojis } from "@/features/folder-dialog/lib/emoji-utils";
import { auth } from "@/lib/auth";

type Variables = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};

const folders = new Hono<{ Variables: Variables }>();

// GET /api/folders - Get all folders for the authenticated user, optionally filtered by category
folders.get("/", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const category = c.req.query("category"); // Optional filter: "Notes" | "Journals" | "Kanbans"

    let whereCondition = eq(folder.userId, user.id);
    
    if (category && ["Notes", "Journals", "Kanbans"].includes(category)) {
      whereCondition = and(eq(folder.userId, user.id), eq(folder.category, category))!;
    }

    const foldersList = await db
      .select()
      .from(folder)
      .where(whereCondition)
      .orderBy(desc(folder.createdAt));

    return c.json({ folders: foldersList }, 200);
  } catch (error: any) {
    console.error("Get folders error:", error);
    return c.json({ error: error?.message || "Failed to fetch folders" }, 500);
  }
});

// GET /api/folders/:id - Get a specific folder by ID
folders.get("/:id", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");
    const [folderData] = await db
      .select()
      .from(folder)
      .where(and(eq(folder.id, id), eq(folder.userId, user.id)))
      .limit(1);

    if (!folderData) {
      return c.json({ error: "Folder not found" }, 404);
    }

    return c.json({ folder: folderData }, 200);
  } catch (error: any) {
    console.error("Get folder error:", error);
    return c.json({ error: error?.message || "Failed to fetch folder" }, 500);
  }
});

// POST /api/folders - Create a new folder
folders.post("/", zValidator("json", folderWithParentSchema), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const data = c.req.valid("json");
    const { name, emoji, description, parent } = data;

    // Check for duplicate folder name in the same category (case-insensitive, ignoring emojis)
    const existingFolders = await db
      .select()
      .from(folder)
      .where(and(eq(folder.userId, user.id), eq(folder.category, parent)));

    const nameWithoutEmoji = removeEmojis(name).trim().toLowerCase();
    const duplicate = existingFolders.find((f) => 
      removeEmojis(f.name).trim().toLowerCase() === nameWithoutEmoji
    );

    if (duplicate) {
      return c.json({ 
        error: "A folder with this name already exists in this category" 
      }, 400);
    }

    // Extract emoji from name if not provided
    const extractedEmoji = emoji || extractEmoji(name) || null;

    // Generate ID (using crypto.randomUUID() which is built-in)
    const id = crypto.randomUUID();

    // Get the highest order value for this category to append new folder at the end
    const [lastFolder] = await db
      .select({ order: folder.order })
      .from(folder)
      .where(and(eq(folder.userId, user.id), eq(folder.category, parent)))
      .orderBy(desc(folder.order))
      .limit(1);

    const newOrder = (lastFolder?.order ?? -1) + 1;

    const [newFolder] = await db
      .insert(folder)
      .values({
        id,
        userId: user.id,
        category: parent,
        name,
        emoji: extractedEmoji,
        description: description || null,
        order: newOrder,
      })
      .returning();

    return c.json({ folder: newFolder }, 201);
  } catch (error: any) {
    console.error("Create folder error:", error);
    return c.json({ error: error?.message || "Failed to create folder" }, 500);
  }
});

// PUT /api/folders/:id - Update an existing folder
folders.put("/:id", zValidator("json", z.object({
  name: z.string().min(1).max(50).optional(),
  emoji: z.string().optional(),
  description: z.string().max(500).optional().nullable(),
  parent: z.enum(["Notes", "Journals", "Kanbans"]).optional(),
}).passthrough()), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");
    const data = c.req.valid("json");

    // Check if folder exists and belongs to user
    const [existingFolder] = await db
      .select()
      .from(folder)
      .where(and(eq(folder.id, id), eq(folder.userId, user.id)))
      .limit(1);

    if (!existingFolder) {
      return c.json({ error: "Folder not found" }, 404);
    }

    // Check for duplicate folder name if name is being updated
    if (data.name !== undefined && data.name !== existingFolder.name) {
      const existingFolders = await db
        .select()
        .from(folder)
        .where(and(eq(folder.userId, user.id), eq(folder.category, data.parent || existingFolder.category)));

      const nameWithoutEmoji = removeEmojis(data.name).trim().toLowerCase();
      const duplicate = existingFolders.find((f) => 
        f.id !== id && removeEmojis(f.name).trim().toLowerCase() === nameWithoutEmoji
      );

      if (duplicate) {
        return c.json({ 
          error: "A folder with this name already exists in this category" 
        }, 400);
      }
    }

    // Prepare update data
    const updateData: Partial<typeof folder.$inferInsert> = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
      // Extract emoji from name if not explicitly provided
      updateData.emoji = data.emoji || extractEmoji(data.name) || existingFolder.emoji;
    } else if (data.emoji !== undefined) {
      updateData.emoji = data.emoji;
    }

    if (data.description !== undefined) {
      updateData.description = data.description || null;
    }

    if (data.parent && data.parent !== existingFolder.category) {
      // If changing category, get new order for that category
      const [lastFolder] = await db
        .select({ order: folder.order })
        .from(folder)
        .where(and(eq(folder.userId, user.id), eq(folder.category, data.parent)))
        .orderBy(desc(folder.order))
        .limit(1);

      updateData.category = data.parent;
      updateData.order = (lastFolder?.order ?? -1) + 1;
    }

    const [updatedFolder] = await db
      .update(folder)
      .set(updateData)
      .where(and(eq(folder.id, id), eq(folder.userId, user.id)))
      .returning();

    return c.json({ folder: updatedFolder }, 200);
  } catch (error: any) {
    console.error("Update folder error:", error);
    return c.json({ error: error?.message || "Failed to update folder" }, 500);
  }
});

// DELETE /api/folders/:id - Delete a folder
folders.delete("/:id", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");

    // Check if folder exists and belongs to user
    const [existingFolder] = await db
      .select()
      .from(folder)
      .where(and(eq(folder.id, id), eq(folder.userId, user.id)))
      .limit(1);

    if (!existingFolder) {
      return c.json({ error: "Folder not found" }, 404);
    }

    // Delete the folder (cascade will handle related items)
    await db.delete(folder).where(and(eq(folder.id, id), eq(folder.userId, user.id)));

    return c.json({ message: "Folder deleted successfully" }, 200);
  } catch (error: any) {
    console.error("Delete folder error:", error);
    return c.json({ error: error?.message || "Failed to delete folder" }, 500);
  }
});

export default folders;

