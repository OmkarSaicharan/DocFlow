import React from "react";
import {
  FileText,
  Plus,
  Upload,
  Users,
  CheckCircle,
  HelpCircle,
  Heart
} from "lucide-react";

interface WelcomePanelProps {
  onCreateNewDoc: () => void;
  currentUserEmail: string;
}

export default function WelcomePanel({ onCreateNewDoc, currentUserEmail }: WelcomePanelProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50 min-h-screen overflow-y-auto" id="welcome-panel">
      <div className="max-w-2xl w-full space-y-8 text-center animate-in fade-in duration-300">
        {/* Banner Logo */}
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 text-white mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome to DocFlow
          </h2>
          <p className="text-slate-500 mt-2 text-sm max-w-md mx-auto">
            A premium full-stack rich-text document manager featuring automated local autosaving, file imports, and sharing permissions.
          </p>
        </div>

        {/* Features Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-xs">
            <div className="h-8 w-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-3">
              <Plus className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Rich-Text TipTap Editor</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Format your documents instantly with headings, bold, italics, underlines, and clean bulleted or ordered lists.
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-xs">
            <div className="h-8 w-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Instant File Import</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Upload `.txt` and `.md` files directly. Your files are automatically parsed and saved as rich, interactive database documents.
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-xs">
            <div className="h-8 w-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Multi-User Collaboration</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Share documents securely via email. Use the active persona switcher in the sidebar to simulate different users and check shared views instantly.
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-xs">
            <div className="h-8 w-8 bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center mb-3">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Real-time Autosave</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Never lose your changes. Every single keypress is tracked and debounced to synchronize seamlessly with our SQLite server.
            </p>
          </div>
        </div>

        {/* Demo Guide Banner */}
        <div className="p-5 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl text-left">
          <h4 className="font-bold text-indigo-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            Testing Instructions for Reviewers
          </h4>
          <ol className="mt-3 text-xs text-indigo-950/80 space-y-2 list-decimal list-inside">
            <li>Click <strong>New Doc</strong> or <strong>Import</strong> a local `.txt`/`.md` file to seed your database.</li>
            <li>Double-click the document title to rename it. Type some text into the editor. Notice the green <strong>Saved</strong> badge appearing.</li>
            <li>Click the dark <strong>Share</strong> button at the top right, enter <code>collaborator@example.com</code> and save.</li>
            <li>In the sidebar, locate the <strong>Active User Persona</strong> selector, and switch from <code>{currentUserEmail}</code> to <code>collaborator@example.com</code>.</li>
            <li>Click the <strong>Shared</strong> tab. You will see the document you just shared listed and fully editable!</li>
          </ol>
        </div>

        {/* CTA */}
        <div>
          <button
            onClick={onCreateNewDoc}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20"
          >
            <Plus className="w-5 h-5" /> Create Your First Document
          </button>
        </div>
      </div>
    </div>
  );
}
