import React, { useState, useRef } from "react";
import {
  Search,
  Plus,
  FileText,
  Users,
  Upload,
  User,
  Trash2,
  Lock,
  ChevronRight,
  Sparkles,
  RefreshCw,
  LogOut,
  FolderDot
} from "lucide-react";
import { Document } from "../types";

interface SidebarProps {
  ownedDocs: Document[];
  sharedDocs: Document[];
  selectedDocId: string | null;
  onDocSelect: (doc: Document) => void;
  onCreateNewDoc: () => void;
  onImportDoc: (title: string, content: string) => void;
  currentUserEmail: string;
  onUserEmailChange: (email: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
}

export default function Sidebar({
  ownedDocs,
  sharedDocs,
  selectedDocId,
  onDocSelect,
  onCreateNewDoc,
  onImportDoc,
  currentUserEmail,
  onUserEmailChange,
  isLoading,
  onRefresh
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"owned" | "shared">("owned");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingEmail, setIsAddingEmail] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState("");
  const [presetEmails, setPresetEmails] = useState<string[]>([
    currentUserEmail,
    "collaborator@example.com",
    "reviewer@example.com"
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter documents by search query
  const getFilteredDocs = () => {
    const list = activeTab === "owned" ? ownedDocs : sharedDocs;
    if (!searchQuery.trim()) return list;
    const query = searchQuery.toLowerCase();
    return list.filter((doc) => doc.title.toLowerCase().includes(query));
  };

  const filteredDocs = getFilteredDocs();

  // Handle txt/md file import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (fileExtension !== "txt" && fileExtension !== "md") {
      alert("Unsupported file type. Please upload a .txt or .md file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      // Use file name without extension as title
      const title = file.name.replace(/\.[^/.]+$/, "");
      onImportDoc(title, content);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmailInput.trim().toLowerCase();
    if (!email) return;

    if (!presetEmails.includes(email)) {
      setPresetEmails([...presetEmails, email]);
    }
    onUserEmailChange(email);
    setIsAddingEmail(false);
    setNewEmailInput("");
  };

  return (
    <div className="w-full md:w-80 bg-slate-900 text-slate-100 flex flex-col h-full border-r border-slate-800" id="sidebar">
      {/* Sidebar Header: Brand & Identity */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-900/30">
            <FolderDot className="w-5 h-5 text-indigo-100" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-none">DocFlow</h1>
            <span className="text-[10px] font-medium text-slate-400">Prisma + SQLite DB</span>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Refresh document lists"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Identity Selector Section */}
      <div className="p-4 bg-slate-950/45 border-b border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active User Persona</span>
          {!isAddingEmail && (
            <button
              onClick={() => setIsAddingEmail(true)}
              className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
            >
              Add email
            </button>
          )}
        </div>

        {isAddingEmail ? (
          <form onSubmit={handleAddEmail} className="flex gap-1.5">
            <input
              type="email"
              required
              id="sidebar-new-email"
              placeholder="user@example.com"
              value={newEmailInput}
              onChange={(e) => setNewEmailInput(e.target.value)}
              className="flex-1 px-2.5 py-1 text-xs bg-slate-800 border border-slate-700 rounded focus:border-indigo-500 focus:outline-none text-white"
            />
            <button
              type="submit"
              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold rounded cursor-pointer text-white"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsAddingEmail(false)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded cursor-pointer"
            >
              X
            </button>
          </form>
        ) : (
          <div className="relative">
            <select
              value={currentUserEmail}
              onChange={(e) => onUserEmailChange(e.target.value)}
              id="user-persona-selector"
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 focus:outline-none cursor-pointer appearance-none transition-colors"
            >
              {presetEmails.map((email) => (
                <option key={email} value={email}>
                  {email === currentUserEmail ? `${email} (Active)` : email}
                </option>
              ))}
            </select>
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 rotate-90 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Navigation Tabs (Owned vs. Shared) */}
      <div className="p-3 grid grid-cols-2 gap-1 bg-slate-900 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("owned")}
          id="tab-owned"
          className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${activeTab === "owned" ? "bg-slate-800 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"}`}
        >
          <FileText className="w-3.5 h-3.5" />
          My Docs ({ownedDocs.length})
        </button>
        <button
          onClick={() => setActiveTab("shared")}
          id="tab-shared"
          className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${activeTab === "shared" ? "bg-slate-800 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"}`}
        >
          <Users className="w-3.5 h-3.5" />
          Shared ({sharedDocs.length})
        </button>
      </div>

      {/* Action Tray: New & Import */}
      <div className="p-3 grid grid-cols-2 gap-2 border-b border-slate-800 bg-slate-950/15">
        <button
          onClick={onCreateNewDoc}
          id="new-document-btn"
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" /> New Doc
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          id="import-document-btn"
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-lg cursor-pointer transition-colors border border-slate-700/60"
        >
          <Upload className="w-3.5 h-3.5" /> Import (.txt/.md)
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".txt,.md"
          className="hidden"
        />
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-800/60">
        <div className="relative">
          <input
            type="text"
            id="sidebar-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search titles..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-800/80 border border-slate-750 focus:border-indigo-500 focus:outline-none rounded-lg text-xs text-slate-100 placeholder-slate-450 transition-all"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-450" />
        </div>
      </div>

      {/* Document List Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5" id="document-sidebar-list">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
            <span className="text-[10px] text-slate-500">Loading documents...</span>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl px-4">
            {searchQuery
              ? "No documents match your query"
              : activeTab === "owned"
              ? "You haven't created any documents yet. Click 'New Doc' to start!"
              : "No shared documents found. Share files with this email address to see them here."}
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const isSelected = doc.id === selectedDocId;
            return (
              <div
                key={doc.id}
                onClick={() => onDocSelect(doc)}
                className={`group flex flex-col p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-800 border-indigo-500/80 shadow-md shadow-slate-950/20 text-white"
                    : "bg-slate-900/50 hover:bg-slate-850/80 border-slate-800/40 text-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold truncate leading-tight flex-1" title={doc.title}>
                    {doc.title || "Untitled Document"}
                  </span>
                  {activeTab === "shared" && (
                    <span className="flex-shrink-0 px-1.5 py-0.5 bg-slate-800 text-[9px] font-bold text-slate-400 border border-slate-700/50 rounded-xs">
                      Shared
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2.5 text-[9px] text-slate-500 font-medium group-hover:text-slate-400">
                  <span>
                    Updated {new Date(doc.updatedAt).toLocaleDateString()}
                  </span>
                  {activeTab === "owned" && (
                    <span className="text-slate-500 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Private
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/25 flex items-center justify-between text-[10px] text-slate-500">
        <span className="font-mono">v1.0.0 Stable</span>
        <span className="flex items-center gap-1 font-semibold text-indigo-400/80">
          Auto-saved local
        </span>
      </div>
    </div>
  );
}
