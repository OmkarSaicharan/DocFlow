import { Document, Share } from "../types";

// Check if we are running in local-only mode or if the API crashed / returned 404
let isLocalFallback = false;

export function getIsLocalFallback() {
  return isLocalFallback;
}

// Simple uuid-like generator for client-side
function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Local storage helpers
const STORAGE_DOCS_KEY = "docflow_documents";
const STORAGE_SHARES_KEY = "docflow_shares";

function getLocalDocs(): Document[] {
  try {
    const raw = localStorage.getItem(STORAGE_DOCS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalDocs(docs: Document[]) {
  try {
    localStorage.setItem(STORAGE_DOCS_KEY, JSON.stringify(docs));
  } catch (err) {
    console.error("Local storage save error:", err);
  }
}

function getLocalShares(): Share[] {
  try {
    const raw = localStorage.getItem(STORAGE_SHARES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalShares(shares: Share[]) {
  try {
    localStorage.setItem(STORAGE_SHARES_KEY, JSON.stringify(shares));
  } catch (err) {
    console.error("Local storage save error:", err);
  }
}

// Helper to determine if a response is actual JSON
async function parseResponse(res: Response) {
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error("Invalid response from server");
  }
  return res.json();
}

export async function getDocuments(email: string): Promise<{ owned: Document[]; shared: Document[] }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isLocalFallback) {
    try {
      const res = await fetch(`/api/documents?email=${encodeURIComponent(cleanEmail)}`);
      if (res.ok) {
        const data = await parseResponse(res);
        return data;
      } else {
        throw new Error("Server returned non-ok status");
      }
    } catch (err) {
      console.warn("API Error, falling back to LocalStorage:", err);
      isLocalFallback = true;
    }
  }

  // LocalFallback implementation
  const allDocs = getLocalDocs();
  const owned = allDocs.filter((d) => d.ownerEmail.toLowerCase() === cleanEmail);
  
  const localShares = getLocalShares();
  const sharedIds = localShares
    .filter((s) => s.sharedWith.toLowerCase() === cleanEmail)
    .map((s) => s.documentId);
  const shared = allDocs.filter((d) => sharedIds.includes(d.id));

  return { owned, shared };
}

export async function createDocument(title: string, content: string, ownerEmail: string): Promise<Document> {
  const cleanEmail = ownerEmail.trim().toLowerCase();
  if (!isLocalFallback) {
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, ownerEmail: cleanEmail }),
      });
      if (res.ok) {
        return await parseResponse(res);
      } else {
        throw new Error("Server failed to create document");
      }
    } catch (err) {
      console.warn("API Error, falling back to LocalStorage:", err);
      isLocalFallback = true;
    }
  }

  // LocalFallback implementation
  const newDoc: Document = {
    id: generateId(),
    title: title.trim() || "Untitled Document",
    content: content || "",
    ownerEmail: cleanEmail,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const docs = getLocalDocs();
  docs.push(newDoc);
  saveLocalDocs(docs);

  return newDoc;
}

export async function getDocument(id: string, email: string): Promise<Document & { isOwner: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isLocalFallback) {
    try {
      const res = await fetch(`/api/documents/${id}?email=${encodeURIComponent(cleanEmail)}`);
      if (res.ok) {
        return await parseResponse(res);
      } else {
        throw new Error("Server failed to retrieve document");
      }
    } catch (err) {
      console.warn("API Error, falling back to LocalStorage:", err);
      isLocalFallback = true;
    }
  }

  // LocalFallback implementation
  const allDocs = getLocalDocs();
  const doc = allDocs.find((d) => d.id === id);
  if (!doc) {
    throw new Error("Document not found");
  }

  const isOwner = doc.ownerEmail.toLowerCase() === cleanEmail;
  const localShares = getLocalShares();
  const isShared = localShares.some(
    (s) => s.documentId === id && s.sharedWith.toLowerCase() === cleanEmail
  );

  if (!isOwner && !isShared) {
    throw new Error("You do not have permission to view this document");
  }

  return { ...doc, isOwner };
}

export async function updateDocument(id: string, email: string, updates: { title?: string; content?: string }): Promise<Document> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isLocalFallback) {
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, ...updates }),
      });
      if (res.ok) {
        return await parseResponse(res);
      } else {
        throw new Error("Server failed to update document");
      }
    } catch (err) {
      console.warn("API Error, falling back to LocalStorage:", err);
      isLocalFallback = true;
    }
  }

  // LocalFallback implementation
  const allDocs = getLocalDocs();
  const docIndex = allDocs.findIndex((d) => d.id === id);
  if (docIndex === -1) {
    throw new Error("Document not found");
  }

  const doc = allDocs[docIndex];
  const isOwner = doc.ownerEmail.toLowerCase() === cleanEmail;
  const localShares = getLocalShares();
  const isShared = localShares.some(
    (s) => s.documentId === id && s.sharedWith.toLowerCase() === cleanEmail
  );

  if (!isOwner && !isShared) {
    throw new Error("You do not have permission to edit this document");
  }

  const updatedDoc: Document = {
    ...doc,
    ...(updates.title !== undefined ? { title: updates.title.trim() || "Untitled Document" } : {}),
    ...(updates.content !== undefined ? { content: updates.content } : {}),
    updatedAt: new Date().toISOString(),
  };

  allDocs[docIndex] = updatedDoc;
  saveLocalDocs(allDocs);

  return updatedDoc;
}

export async function deleteDocument(id: string, email: string): Promise<{ success: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isLocalFallback) {
    try {
      const res = await fetch(`/api/documents/${id}?email=${encodeURIComponent(cleanEmail)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        return await parseResponse(res);
      } else {
        throw new Error("Server failed to delete document");
      }
    } catch (err) {
      console.warn("API Error, falling back to LocalStorage:", err);
      isLocalFallback = true;
    }
  }

  // LocalFallback implementation
  const allDocs = getLocalDocs();
  const docIndex = allDocs.findIndex((d) => d.id === id);
  if (docIndex === -1) {
    throw new Error("Document not found");
  }

  const doc = allDocs[docIndex];
  if (doc.ownerEmail.toLowerCase() !== cleanEmail) {
    throw new Error("Only the owner can delete this document");
  }

  // Delete document
  const filteredDocs = allDocs.filter((d) => d.id !== id);
  saveLocalDocs(filteredDocs);

  // Delete associated shares
  const filteredShares = getLocalShares().filter((s) => s.documentId !== id);
  saveLocalShares(filteredShares);

  return { success: true };
}

export async function getShares(id: string, email: string): Promise<Share[]> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isLocalFallback) {
    try {
      const res = await fetch(`/api/documents/${id}/shares?email=${encodeURIComponent(cleanEmail)}`);
      if (res.ok) {
        return await parseResponse(res);
      } else {
        throw new Error("Server failed to retrieve shares");
      }
    } catch (err) {
      console.warn("API Error, falling back to LocalStorage:", err);
      isLocalFallback = true;
    }
  }

  // LocalFallback implementation
  const allDocs = getLocalDocs();
  const doc = allDocs.find((d) => d.id === id);
  if (!doc) {
    throw new Error("Document not found");
  }

  if (doc.ownerEmail.toLowerCase() !== cleanEmail) {
    throw new Error("Only the document owner can manage shares");
  }

  const allShares = getLocalShares();
  return allShares.filter((s) => s.documentId === id);
}

export async function shareDocument(id: string, email: string, sharedWith: string): Promise<Share> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanSharedWith = sharedWith.trim().toLowerCase();

  if (cleanEmail === cleanSharedWith) {
    throw new Error("You cannot share a document with yourself");
  }

  if (!isLocalFallback) {
    try {
      const res = await fetch(`/api/documents/${id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, sharedWith: cleanSharedWith }),
      });
      if (res.ok) {
        return await parseResponse(res);
      } else {
        const errData = await parseResponse(res);
        throw new Error(errData.error || "Server failed to share document");
      }
    } catch (err: any) {
      console.warn("API Error, falling back to LocalStorage:", err);
      isLocalFallback = true;
    }
  }

  // LocalFallback implementation
  const allDocs = getLocalDocs();
  const doc = allDocs.find((d) => d.id === id);
  if (!doc) {
    throw new Error("Document not found");
  }

  if (doc.ownerEmail.toLowerCase() !== cleanEmail) {
    throw new Error("Only the document owner can share it");
  }

  const allShares = getLocalShares();
  const existingShare = allShares.find(
    (s) => s.documentId === id && s.sharedWith.toLowerCase() === cleanSharedWith
  );

  if (existingShare) {
    return existingShare;
  }

  const newShare: Share = {
    id: generateId(),
    documentId: id,
    sharedWith: cleanSharedWith,
    createdAt: new Date().toISOString(),
  };

  allShares.push(newShare);
  saveLocalShares(allShares);

  return newShare;
}

export async function unshareDocument(id: string, email: string, sharedWith: string): Promise<{ success: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanSharedWith = sharedWith.trim().toLowerCase();

  if (!isLocalFallback) {
    try {
      const res = await fetch(
        `/api/documents/${id}/share?email=${encodeURIComponent(cleanEmail)}&sharedWith=${encodeURIComponent(cleanSharedWith)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        return await parseResponse(res);
      } else {
        throw new Error("Server failed to remove share");
      }
    } catch (err) {
      console.warn("API Error, falling back to LocalStorage:", err);
      isLocalFallback = true;
    }
  }

  // LocalFallback implementation
  const allDocs = getLocalDocs();
  const doc = allDocs.find((d) => d.id === id);
  if (!doc) {
    throw new Error("Document not found");
  }

  if (doc.ownerEmail.toLowerCase() !== cleanEmail) {
    throw new Error("Only the document owner can manage shares");
  }

  const allShares = getLocalShares();
  const filteredShares = allShares.filter(
    (s) => !(s.documentId === id && s.sharedWith.toLowerCase() === cleanSharedWith)
  );

  saveLocalShares(filteredShares);
  return { success: true };
}
