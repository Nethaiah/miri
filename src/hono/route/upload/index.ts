import { Hono } from "hono";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server"; // For ADMIN uploads (bypasses RLS)

const upload = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

upload.post("/", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return c.json(
        { error: `File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)` },
        400
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return c.json(
        { error: "Invalid file type. Only images are allowed." },
        400
      );
    }

    // Generate unique filename with user ID prefix
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}-${originalName}`;
    const filePath = `${user.id}/${filename}`;

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage using Admin Client to bypass RLS
    const { data, error } = await supabaseAdmin.storage
      .from("images")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return c.json({ error: error.message || "Failed to upload file" }, 500);
    }

    // Get public URL using Admin client (works identically to public client for this)
    const { data: urlData } = supabaseAdmin.storage
      .from("images")
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      return c.json({ error: "Failed to get public URL" }, 500);
    }

    return c.json({ url: urlData.publicUrl, success: true }, 200);
  } catch (error: any) {
    console.error("Upload error:", error);
    return c.json({ error: error?.message || "Failed to upload file" }, 500);
  }
});

export default upload;
