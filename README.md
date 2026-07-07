# Collaborative Document Editor (DocFlow)

A premium, full-stack rich-text document manager built with **React**, **Vite**, **Express**, **Prisma**, and **SQLite**. It features instant `.txt`/`.md` imports, autosaving with visual feedback, and secure cross-user email sharing.

---

## 🎨 Visual Preview & User Features

1. **Rich-Text TipTap Editor**: A fast, fully interactive editing canvas with full formatting capabilities (bold, italic, underline, headings H1-H3, bullet lists, ordered lists) powered by [TipTap](https://tiptap.dev).
2. **Real-time Autosave**: Listens to edit states and triggers a debounced (1s) sync with the local SQLite server. High-fidelity visual badges change states instantly (`Saving changes...` -> `Saved` or `Autosave failed`).
3. **In-place Title Rename**: Double-click or type directly on the document's header input to rename files instantly (debounced at 800ms).
4. **Instant File Imports**: Drag-and-drop or select any `.txt` or `.md` files. The app automatically parses lines (converting markdown headers and bullet lists) and inserts them as interactive, styled documents in your SQLite database.
5. **Simulated User Switching**: A built-in "Persona Switcher" dropdown lets reviewers transition between multiple active email addresses (`omkarsaicharan@gmail.com`, `collaborator@example.com`, etc.) to test permission scopes and secure sharing in real-time.
6. **Robust Sharing System**: Share your documents with other users by email. Owned files can be deleted or shared, while shared files are read/write but protected from unauthorized owner-actions.

---

## 📁 Project Structure

```bash
├── prisma/
│   ├── schema.prisma      # SQLite Database Schema
│   └── dev.db             # Local Database File
├── src/
│   ├── components/
│   │   ├── Editor.tsx     # TipTap Editor & Sharing Modal
│   │   ├── Sidebar.tsx    # Document Lists, User Selector & File Importer
│   │   └── WelcomePanel.tsx # Welcome guide and reviewer walkthrough
│   ├── App.tsx            # Main App Layout & State Engine
│   ├── index.css          # Tailwind Directives & Custom TipTap Styles
│   ├── main.tsx           # React Mounting Node
│   └── types.ts           # Shared TS Interfaces
├── server.ts              # Full-stack Express Server (API & Vite Middleware)
├── test.js                # Database Integration Test
└── package.json           # Scripts & NPM Dependencies
```

---

## ⚙️ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Prepare Database Schema
```bash
npx prisma db push
```

### 3. Run Development Server
```bash
npm run dev
```
The server will boot on `http://localhost:3000`. Open it in your browser.

---

## 🧪 Running Automated Tests

A database integration test verifies the database schema, Prisma client, and local SQLite writes:
```bash
npm run test
```
Outputs:
```text
Starting database integration test...
Creating document...
Document created with ID: 47246080-da55-4be0-82cc-c6a7790da5ea
Verifying document retrieval...
Document successfully retrieved!
Cleaning up test document...
Database connection & Prisma integration test PASSED! 🎉
```
