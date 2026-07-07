import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Helper to check access
async function checkDocumentAccess(documentId: string, email: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { shares: true },
  });
  if (!doc) return { doc: null, hasAccess: false, isOwner: false };

  const isOwner = doc.ownerEmail.toLowerCase() === email.toLowerCase();
  const isShared = doc.shares.some(
    (share) => share.sharedWith.toLowerCase() === email.toLowerCase()
  );

  return { doc, hasAccess: isOwner || isShared, isOwner };
}

// 1. Get documents for a user (owned and shared)
app.get("/api/documents", async (req, res) => {
  try {
    const email = (req.query.email as string) || "";
    if (!email) {
      res.status(400).json({ error: "Email query parameter is required" });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    const owned = await prisma.document.findMany({
      where: { ownerEmail: cleanEmail },
      orderBy: { updatedAt: "desc" },
    });

    const shared = await prisma.document.findMany({
      where: {
        shares: {
          some: { sharedWith: cleanEmail },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json({ owned, shared });
  } catch (error: any) {
    console.error("Error getting documents:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 2. Create a new document
app.post("/api/documents", async (req, res) => {
  try {
    const { title, content, ownerEmail } = req.body;
    if (!title || !ownerEmail) {
      res.status(400).json({ error: "Title and ownerEmail are required" });
      return;
    }

    const cleanEmail = ownerEmail.trim().toLowerCase();

    const newDoc = await prisma.document.create({
      data: {
        title: title.trim(),
        content: content || "",
        ownerEmail: cleanEmail,
      },
    });

    res.status(201).json(newDoc);
  } catch (error: any) {
    console.error("Error creating document:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 3. Get a specific document
app.get("/api/documents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const email = (req.query.email as string) || "";

    if (!email) {
      res.status(400).json({ error: "User email is required to access document" });
      return;
    }

    const { doc, hasAccess, isOwner } = await checkDocumentAccess(id, email);

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    if (!hasAccess) {
      res.status(403).json({ error: "You do not have permission to view this document" });
      return;
    }

    res.json({ ...doc, isOwner });
  } catch (error: any) {
    console.error("Error getting document:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 4. Update a document (edit / autosave / rename)
app.put("/api/documents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, email } = req.body;

    if (!email) {
      res.status(400).json({ error: "User email is required to update document" });
      return;
    }

    const { doc, hasAccess, isOwner } = await checkDocumentAccess(id, email);

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    if (!hasAccess) {
      res.status(403).json({ error: "You do not have permission to edit this document" });
      return;
    }

    // Prepare update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content;

    const updatedDoc = await prisma.document.update({
      where: { id },
      data: updateData,
    });

    res.json(updatedDoc);
  } catch (error: any) {
    console.error("Error updating document:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 5. Delete a document
app.delete("/api/documents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const email = (req.query.email as string) || "";

    if (!email) {
      res.status(400).json({ error: "User email is required to delete document" });
      return;
    }

    const { doc, isOwner } = await checkDocumentAccess(id, email);

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    if (!isOwner) {
      res.status(403).json({ error: "Only the owner can delete this document" });
      return;
    }

    await prisma.document.delete({
      where: { id },
    });

    res.json({ success: true, message: "Document deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting document:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 6. Share document with user by email
app.post("/api/documents/:id/share", async (req, res) => {
  try {
    const { id } = req.params;
    const { email, sharedWith } = req.body; // email is requester (must be owner), sharedWith is recipient

    if (!email || !sharedWith) {
      res.status(400).json({ error: "Owner email and share recipient email are required" });
      return;
    }

    const cleanSharedWith = sharedWith.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail === cleanSharedWith) {
      res.status(400).json({ error: "You cannot share a document with yourself" });
      return;
    }

    const { doc, isOwner } = await checkDocumentAccess(id, cleanEmail);

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    if (!isOwner) {
      res.status(403).json({ error: "Only the document owner can share it" });
      return;
    }

    // Create or find share
    const share = await prisma.share.upsert({
      where: {
        documentId_sharedWith: {
          documentId: id,
          sharedWith: cleanSharedWith,
        },
      },
      update: {},
      create: {
        documentId: id,
        sharedWith: cleanSharedWith,
      },
    });

    res.status(201).json(share);
  } catch (error: any) {
    console.error("Error sharing document:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 7. Unshare document with user by email
app.delete("/api/documents/:id/share", async (req, res) => {
  try {
    const { id } = req.params;
    const email = (req.query.email as string) || "";
    const sharedWith = (req.query.sharedWith as string) || "";

    if (!email || !sharedWith) {
      res.status(400).json({ error: "Owner email and share recipient email are required" });
      return;
    }

    const cleanSharedWith = sharedWith.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    const { doc, isOwner } = await checkDocumentAccess(id, cleanEmail);

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    if (!isOwner) {
      res.status(403).json({ error: "Only the document owner can manage shares" });
      return;
    }

    await prisma.share.delete({
      where: {
        documentId_sharedWith: {
          documentId: id,
          sharedWith: cleanSharedWith,
        },
      },
    });

    res.json({ success: true, message: "Share removed successfully" });
  } catch (error: any) {
    console.error("Error unsharing document:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 8. Get list of active shares for a document
app.get("/api/documents/:id/shares", async (req, res) => {
  try {
    const { id } = req.params;
    const email = (req.query.email as string) || "";

    if (!email) {
      res.status(400).json({ error: "User email is required" });
      return;
    }

    const { doc, isOwner } = await checkDocumentAccess(id, email);

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    if (!isOwner) {
      res.status(403).json({ error: "Only the owner can view document share settings" });
      return;
    }

    const shares = await prisma.share.findMany({
      where: { documentId: id },
      orderBy: { createdAt: "desc" },
    });

    res.json(shares);
  } catch (error: any) {
    console.error("Error getting document shares:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
