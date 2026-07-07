import React, { useEffect, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Save,
  Check,
  AlertCircle,
  Share2,
  Trash2,
  X,
  Plus
} from "lucide-react";
import { Document, Share } from "../types";

interface EditorProps {
  document: Document;
  currentUserEmail: string;
  onDocumentUpdated: (doc: Document) => void;
  onDocumentDeleted: (id: string) => void;
}

export default function Editor({
  document,
  currentUserEmail,
  onDocumentUpdated,
  onDocumentDeleted
}: EditorProps) {
  const [title, setTitle] = useState(document.title);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [errorMessage, setErrorMessage] = useState("");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [shareEmailInput, setShareEmailInput] = useState("");
  const [shares, setShares] = useState<Share[]>([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState("");

  const titleRef = useRef(title);
  titleRef.current = title;

  // Sync title when active document changes
  useEffect(() => {
    setTitle(document.title);
    setSaveStatus("saved");
    setErrorMessage("");
    setIsShareModalOpen(false);
    setIsDeleteModalOpen(false);
    setShareEmailInput("");
    setShareError("");

    // Clear any pending autosave timers from previous document
    if (contentAutosaveTimerRef.current) {
      clearTimeout(contentAutosaveTimerRef.current);
    }
    if (titleAutosaveTimerRef.current) {
      clearTimeout(titleAutosaveTimerRef.current);
    }
  }, [document.id]);

  // Sync title dynamically when it is updated from parent (e.g. via content title auto-extraction)
  useEffect(() => {
    if (saveStatus === "saved") {
      setTitle(document.title);
    }
  }, [document.title, saveStatus]);

  // Clean up timers on component unmount
  useEffect(() => {
    return () => {
      if (contentAutosaveTimerRef.current) {
        clearTimeout(contentAutosaveTimerRef.current);
      }
      if (titleAutosaveTimerRef.current) {
        clearTimeout(titleAutosaveTimerRef.current);
      }
    };
  }, []);

  // Fetch document shares when share modal opens
  useEffect(() => {
    if (isShareModalOpen && document.isOwner) {
      fetchShares();
    }
  }, [isShareModalOpen, document.id]);

  const fetchShares = async () => {
    setShareLoading(true);
    setShareError("");
    try {
      const res = await fetch(`/api/documents/${document.id}/shares?email=${encodeURIComponent(currentUserEmail)}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to fetch share settings");
      }
      const data = await res.json();
      setShares(data);
    } catch (err: any) {
      setShareError(err.message);
    } finally {
      setShareLoading(false);
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmailInput.trim()) return;

    setShareLoading(true);
    setShareError("");
    try {
      const res = await fetch(`/api/documents/${document.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentUserEmail,
          sharedWith: shareEmailInput.trim()
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to share document");
      }

      setShareEmailInput("");
      await fetchShares();
    } catch (err: any) {
      setShareError(err.message);
    } finally {
      setShareLoading(false);
    }
  };

  const handleUnshare = async (sharedWith: string) => {
    setShareLoading(true);
    setShareError("");
    try {
      const res = await fetch(
        `/api/documents/${document.id}/share?email=${encodeURIComponent(currentUserEmail)}&sharedWith=${encodeURIComponent(sharedWith)}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to remove share");
      }

      await fetchShares();
    } catch (err: any) {
      setShareError(err.message);
    } finally {
      setShareLoading(false);
    }
  };

  // Separate Autosave Timer refs
  const contentAutosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const titleAutosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline
    ],
    content: document.content,
    editorProps: {
      attributes: {
        class: "prose max-w-none focus:outline-none min-h-[450px] px-8 py-6 bg-white border border-gray-100 rounded-b-xl shadow-xs",
      },
    },
    onUpdate: ({ editor }) => {
      setSaveStatus("saving");
      if (contentAutosaveTimerRef.current) {
        clearTimeout(contentAutosaveTimerRef.current);
      }
      contentAutosaveTimerRef.current = setTimeout(() => {
        saveDocumentContent(editor.getHTML());
      }, 1000); // 1s debounce for autosave
    }
  }, [document.id]); // Re-create editor instance on document ID change

  // Save Content to backend
  const saveDocumentContent = async (htmlContent: string) => {
    try {
      // Auto-extract title if current title is default/empty
      let titleToSave = undefined;
      const currentTitleTrimmed = titleRef.current.trim();
      if (currentTitleTrimmed === "Untitled Document" || currentTitleTrimmed === "") {
        const h1Match = htmlContent.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        if (h1Match && h1Match[1]) {
          const extractedText = h1Match[1].replace(/<[^>]*>/g, "").trim();
          if (extractedText && extractedText !== "Untitled Document") {
            titleToSave = extractedText;
            setTitle(extractedText);
          }
        }
      }

      const res = await fetch(`/api/documents/${document.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentUserEmail,
          content: htmlContent,
          ...(titleToSave ? { title: titleToSave } : {})
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Autosave failed");
      }

      const updated = await res.json();
      onDocumentUpdated({ ...updated, isOwner: document.isOwner });
      setSaveStatus("saved");
    } catch (err: any) {
      console.error(err);
      setSaveStatus("error");
      setErrorMessage(err.message || "Connection error. Autosave failed.");
    }
  };

  // Save Title
  const handleTitleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setSaveStatus("saving");

    if (titleAutosaveTimerRef.current) {
      clearTimeout(titleAutosaveTimerRef.current);
    }

    titleAutosaveTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/documents/${document.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: currentUserEmail,
            title: newTitle.trim() || "Untitled Document"
          })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Title update failed");
        }

        const updated = await res.json();
        onDocumentUpdated({ ...updated, isOwner: document.isOwner });
        setSaveStatus("saved");
      } catch (err: any) {
        console.error(err);
        setSaveStatus("error");
        setErrorMessage(err.message || "Failed to update title");
      }
    }, 800);
  };

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/documents/${document.id}?email=${encodeURIComponent(currentUserEmail)}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to delete document");
      }

      setIsDeleteModalOpen(false);
      onDocumentDeleted(document.id);
    } catch (err: any) {
      alert(err.message || "Failed to delete document");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50 rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden" id="editor-container">
      {/* Upper Status/Metadata Strip */}
      <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200/60 flex flex-wrap gap-2 items-center justify-between text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${saveStatus === "saved" ? "bg-emerald-400" : saveStatus === "saving" ? "bg-amber-400" : "bg-rose-400"}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${saveStatus === "saved" ? "bg-emerald-500" : saveStatus === "saving" ? "bg-amber-500" : "bg-rose-500"}`}></span>
          </span>
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-emerald-700">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          {saveStatus === "saving" && <span className="text-amber-700 animate-pulse">Saving changes...</span>}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1 text-rose-700">
              <AlertCircle className="w-3.5 h-3.5" /> {errorMessage || "Autosave failed"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span>Owner: <strong className="text-slate-700">{document.ownerEmail}</strong></span>
          <span>Updated: <span className="text-slate-600">{new Date(document.updatedAt).toLocaleTimeString()}</span></span>
        </div>
      </div>

      {/* Editor Main Header (Title and Controls) */}
      <div className="p-6 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <input
            type="text"
            id="document-title-input"
            value={title}
            onChange={handleTitleChange}
            className="w-full text-2xl font-bold tracking-tight text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-slate-800 focus:outline-none pb-1 transition-all rounded-xs"
            placeholder="Untitled Document"
          />
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {document.isOwner ? (
            <button
              onClick={() => setIsShareModalOpen(true)}
              id="share-doc-btn"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          ) : (
            <span className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg border border-slate-200">
              Shared Access (Read/Write)
            </span>
          )}

          {document.isOwner && (
            <button
              onClick={handleDeleteClick}
              id="delete-doc-btn"
              className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
              title="Delete Document"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* TipTap Custom Formatting Toolbar */}
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/60 flex flex-wrap gap-1.5 items-center">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`p-2 rounded-md hover:bg-slate-200/70 cursor-pointer transition-colors ${editor.isActive("bold") ? "bg-slate-200 text-slate-900 font-bold" : "text-slate-600"}`}
          title="Bold"
          id="toolbar-bold"
        >
          <Bold className="w-4.5 h-4.5" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`p-2 rounded-md hover:bg-slate-200/70 cursor-pointer transition-colors ${editor.isActive("italic") ? "bg-slate-200 text-slate-900 italic" : "text-slate-600"}`}
          title="Italic"
          id="toolbar-italic"
        >
          <Italic className="w-4.5 h-4.5" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={!editor.can().chain().focus().toggleUnderline().run()}
          className={`p-2 rounded-md hover:bg-slate-200/70 cursor-pointer transition-colors ${editor.isActive("underline") ? "bg-slate-200 text-slate-900 underline" : "text-slate-600"}`}
          title="Underline"
          id="toolbar-underline"
        >
          <UnderlineIcon className="w-4.5 h-4.5" />
        </button>

        <div className="w-[1px] h-6 bg-slate-300/60 mx-1"></div>

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 px-2.5 rounded-md hover:bg-slate-200/70 text-xs font-bold cursor-pointer transition-colors ${editor.isActive("heading", { level: 1 }) ? "bg-slate-200 text-slate-900" : "text-slate-600"}`}
          title="Heading 1"
          id="toolbar-h1"
        >
          H1
        </button>

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 px-2.5 rounded-md hover:bg-slate-200/70 text-xs font-bold cursor-pointer transition-colors ${editor.isActive("heading", { level: 2 }) ? "bg-slate-200 text-slate-900" : "text-slate-600"}`}
          title="Heading 2"
          id="toolbar-h2"
        >
          H2
        </button>

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1.5 px-2.5 rounded-md hover:bg-slate-200/70 text-xs font-bold cursor-pointer transition-colors ${editor.isActive("heading", { level: 3 }) ? "bg-slate-200 text-slate-900" : "text-slate-600"}`}
          title="Heading 3"
          id="toolbar-h3"
        >
          H3
        </button>

        <div className="w-[1px] h-6 bg-slate-300/60 mx-1"></div>

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded-md hover:bg-slate-200/70 cursor-pointer transition-colors ${editor.isActive("bulletList") ? "bg-slate-200 text-slate-900" : "text-slate-600"}`}
          title="Bullet List"
          id="toolbar-bullet-list"
        >
          <List className="w-4.5 h-4.5" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded-md hover:bg-slate-200/70 cursor-pointer transition-colors ${editor.isActive("orderedList") ? "bg-slate-200 text-slate-900" : "text-slate-600"}`}
          title="Numbered List"
          id="toolbar-ordered-list"
        >
          <ListOrdered className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Editor Editable Content Box */}
      <div className="flex-1 bg-white overflow-y-auto" id="editor-content-area">
        <EditorContent editor={editor} />
      </div>

      {/* Share Modal Backdrop / Window */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4" id="share-modal">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Document Share Settings</h3>
                <p className="text-xs text-slate-500 mt-1">Manage email sharing permissions for this file.</p>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Share input form */}
              <form onSubmit={handleShare} className="flex gap-2 mb-6">
                <input
                  type="email"
                  id="share-email-input"
                  required
                  value={shareEmailInput}
                  onChange={(e) => setShareEmailInput(e.target.value)}
                  placeholder="collaborator@example.com"
                  className="flex-1 px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-slate-800 focus:outline-none transition-all"
                />
                <button
                  type="submit"
                  id="submit-share-btn"
                  disabled={shareLoading}
                  className="flex items-center gap-1 px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white text-sm font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" /> Share
                </button>
              </form>

              {shareError && (
                <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-100 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{shareError}</span>
                </div>
              )}

              {/* Shared users list */}
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Currently Shared With</h4>
              {shareLoading && shares.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">Loading shares...</div>
              ) : shares.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  Not shared with anyone yet. Type an email address above to grant access.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {shares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-150 transition-colors text-sm"
                    >
                      <span className="font-medium text-slate-700 truncate mr-2" title={share.sharedWith}>
                        {share.sharedWith}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUnshare(share.sharedWith)}
                        disabled={shareLoading}
                        className="text-xs font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4" id="delete-confirm-modal">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-650">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <h3 className="text-lg font-bold text-slate-900">Delete Document</h3>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                disabled={deleteLoading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 text-sm text-slate-600">
              <p>Are you sure you want to delete <strong className="text-slate-900">"{title || "Untitled Document"}"</strong>?</p>
              <p className="mt-2.5 text-xs text-rose-600 font-semibold bg-rose-50/55 p-3 rounded-xl border border-rose-100/50">
                This action is irreversible. All access and share permissions will be removed immediately.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleteLoading}
                className="px-4 py-2 bg-white hover:bg-slate-150 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-sm font-semibold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
              >
                {deleteLoading ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
