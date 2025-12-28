import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/index";
import { folder } from "@/db/schema";
import { folderSchema } from "@/features/folder-dialog/schema/folder-schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

const folders = new Hono<{ 
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null
  }
 }>();

// GET /api/folders - Get all folders for the authenticated user
folders.get("/", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const foldersList = await db
      .select()
      .from(folder)
      .where(eq(folder.userId, user.id))
      .orderBy(desc(folder.createdAt));

    return c.json({ folders: foldersList }, 200);
  } catch (error: any) {
    console.error("Get folders error:", error);
    return c.json({ error: error?.message || "Failed to fetch folders" }, 500);
  }
});

// PATCH /api/folders/:id/pin - Toggle pin status
// IMPORTANT: Must come BEFORE other /:id routes for proper route matching
folders.patch("/:id/pin", async (c) => {
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

    // Toggle pin status
    const [updatedFolder] = await db
      .update(folder)
      .set({ pinned: !existingFolder.pinned })
      .where(and(eq(folder.id, id), eq(folder.userId, user.id)))
      .returning();

    return c.json({ folder: updatedFolder }, 200);
  } catch (error: any) {
    console.error("Toggle folder pin error:", error);
    return c.json({ error: error?.message || "Failed to toggle folder pin" }, 500);
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
folders.post("/", zValidator("json", folderSchema), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const data = c.req.valid("json");
    const { name, description, color } = data;

    // Check for duplicate folder name (case-insensitive)
    const existingFolders = await db
      .select()
      .from(folder)
      .where(eq(folder.userId, user.id));

    const normalizedName = name.trim().toLowerCase();
    const duplicate = existingFolders.find((f) => 
      f.name.trim().toLowerCase() === normalizedName
    );

    if (duplicate) {
      return c.json({ 
        error: "A folder with this name already exists" 
      }, 400);
    }

    // Get the highest order value to append new folder at the end
    const [lastFolder] = await db
      .select({ order: folder.order })
      .from(folder)
      .where(eq(folder.userId, user.id))
      .orderBy(desc(folder.order))
      .limit(1);

    const newOrder = (lastFolder?.order ?? -1) + 1;

    const [newFolder] = await db
      .insert(folder)
      .values({
        userId: user.id,
        name,
        description: description || null,
        color: color || null,
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
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  color: z.string().optional().nullable(),
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
        .where(eq(folder.userId, user.id));

      const normalizedName = data.name.trim().toLowerCase();
      const duplicate = existingFolders.find((f) => 
        f.id !== id && f.name.trim().toLowerCase() === normalizedName
      );

      if (duplicate) {
        return c.json({ 
          error: "A folder with this name already exists" 
        }, 400);
      }
    }

    // Prepare update data
    const updateData: Partial<typeof folder.$inferInsert> = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.description !== undefined) {
      updateData.description = data.description || null;
    }

    if (data.color !== undefined) {
      updateData.color = data.color || null;
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