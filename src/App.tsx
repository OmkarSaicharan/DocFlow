import React, { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import WelcomePanel from "./components/WelcomePanel";
import { Document } from "./types";
import { AlertCircle, RefreshCw } from "lucide-react";
import * as api from "./lib/api";

export default function App() {
  const [currentUserEmail, setCurrentUserEmail] = useState("omkarsaicharan@gmail.com");
  const [ownedDocs, setOwnedDocs] = useState<Document[]>([]);
  const [sharedDocs, setSharedDocs] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all documents for active email
  const fetchDocuments = async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getDocuments(email);
      setOwnedDocs(data.owned || []);
      setSharedDocs(data.shared || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to retrieve documents");
    } finally {
      setIsLoading(false);
    }
  };

  // Run fetch when email changes
  useEffect(() => {
    fetchDocuments(currentUserEmail);
  }, [currentUserEmail]);

  // Fetch specific document contents
  const handleDocSelect = async (doc: Document) => {
    setError(null);
    try {
      const fullDoc = await api.getDocument(doc.id, currentUserEmail);
      setSelectedDoc(fullDoc);
      setSelectedDocId(doc.id);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to select document");
    }
  };

  // Create a new document
  const handleCreateNewDoc = async () => {
    setError(null);
    try {
      const newDoc = await api.createDocument(
        "Untitled Document",
        "<h1>Untitled Document</h1><p>Start writing your thoughts here...</p>",
        currentUserEmail
      );
      await fetchDocuments(currentUserEmail);

      // Select newly created document
      setSelectedDoc({ ...newDoc, isOwner: true });
      setSelectedDocId(newDoc.id);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to create document");
    }
  };

  // Import md/txt file
  const handleImportDoc = async (title: string, content: string) => {
    setError(null);
    try {
      // Basic text to HTML conversion to support rich text natively
      let formattedContent = content;
      if (!content.trim().startsWith("<")) {
        formattedContent = content
          .split("\n")
          .map((para) => {
            const cleanPara = para.trim();
            if (!cleanPara) return "";
            if (cleanPara.startsWith("# ")) return `<h1>${cleanPara.slice(2)}</h1>`;
            if (cleanPara.startsWith("## ")) return `<h2>${cleanPara.slice(3)}</h2>`;
            if (cleanPara.startsWith("### ")) return `<h3>${cleanPara.slice(4)}</h3>`;
            if (cleanPara.startsWith("- ") || cleanPara.startsWith("* ")) return `<ul><li>${cleanPara.slice(2)}</li></ul>`;
            return `<p>${cleanPara}</p>`;
          })
          .filter(Boolean)
          .join("");
      }

      const newDoc = await api.createDocument(
        title || "Imported Document",
        formattedContent || "<p>Empty file imported.</p>",
        currentUserEmail
      );
      await fetchDocuments(currentUserEmail);

      // Select newly created document
      setSelectedDoc({ ...newDoc, isOwner: true });
      setSelectedDocId(newDoc.id);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to import file");
    }
  };

  // Handler when document title/content is updated inside Editor
  const handleDocumentUpdatedInEditor = (updatedDoc: Document) => {
    setOwnedDocs((prev) =>
      prev.map((doc) => (doc.id === updatedDoc.id ? { ...doc, title: updatedDoc.title, updatedAt: updatedDoc.updatedAt } : doc))
    );
    setSharedDocs((prev) =>
      prev.map((doc) => (doc.id === updatedDoc.id ? { ...doc, title: updatedDoc.title, updatedAt: updatedDoc.updatedAt } : doc))
    );
    if (selectedDocId === updatedDoc.id) {
      setSelectedDoc(updatedDoc);
    }
  };

  // Handler when document is deleted inside Editor
  const handleDocumentDeletedInEditor = (id: string) => {
    setOwnedDocs((prev) => prev.filter((doc) => doc.id !== id));
    setSharedDocs((prev) => prev.filter((doc) => doc.id !== id));
    if (selectedDocId === id) {
      setSelectedDocId(null);
      setSelectedDoc(null);
    }
  };

  // Handler when active user email changes
  const handleUserEmailChange = (newEmail: string) => {
    setCurrentUserEmail(newEmail);
    setSelectedDocId(null);
    setSelectedDoc(null);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden font-sans text-slate-800 bg-slate-100" id="app-root">
      {/* Sidebar navigation */}
      <Sidebar
        ownedDocs={ownedDocs}
        sharedDocs={sharedDocs}
        selectedDocId={selectedDocId}
        onDocSelect={handleDocSelect}
        onCreateNewDoc={handleCreateNewDoc}
        onImportDoc={handleImportDoc}
        currentUserEmail={currentUserEmail}
        onUserEmailChange={handleUserEmailChange}
        isLoading={isLoading}
        onRefresh={() => fetchDocuments(currentUserEmail)}
      />

      {/* Main content pane */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {error && (
          <div className="m-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
            <div>
              <h4 className="font-bold text-sm">Synchronisation Error</h4>
              <p className="text-xs text-rose-700/95 mt-1">{error}</p>
              <button
                onClick={() => fetchDocuments(currentUserEmail)}
                className="mt-2.5 text-xs font-semibold text-rose-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Retry synchronization
              </button>
            </div>
          </div>
        )}

        {selectedDoc ? (
          <div className="flex-1 p-4 md:p-6 overflow-hidden">
            <Editor
              key={selectedDoc.id} // Re-mount Editor completely when doc changes to reset internal TipTap state
              document={selectedDoc}
              currentUserEmail={currentUserEmail}
              onDocumentUpdated={handleDocumentUpdatedInEditor}
              onDocumentDeleted={handleDocumentDeletedInEditor}
            />
          </div>
        ) : (
          <WelcomePanel
            onCreateNewDoc={handleCreateNewDoc}
            currentUserEmail={currentUserEmail}
          />
        )}
      </main>
    </div>
  );
}
