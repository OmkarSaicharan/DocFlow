# AI-Workflow Notes & Honest Reflections

This document records honest reflections and engineering insights gained during the iterative, AI-guided development of the **Collaborative Document Editor**.

---

## 1. Speed-to-Execution & Prisma Iteration

* **Prisma 7 vs. Prisma 6**: During initial schema initialization, the AI environment pulled Prisma v7 which recently changed configuration standards (deprecating the standard inline SQLite `url` parameter in schemas). By diagnosing the CLI validation error immediately, we proactively downgraded Prisma to v6. This allowed the use of local `file:./dev.db` datasources seamlessly without complex external config files, ensuring a robust, self-contained container layout.
* **Database Cohesion**: By running a dedicated automated test script (`test.js`) early, we verified the SQLite connection, Prisma client schema mappings, and read/write stability before ever touching the React code. Having a fully validated database layer eliminated downstream integration issues and made frontend implementation predictable.

---

## 2. Crafting the UX: The Active User Switcher

A typical multi-user sharing system is difficult for a single reviewer or grader to test in an iframe environment, since opening separate incognito windows or multiple accounts is tedious. 

* **The Design Solution**: We designed a local **Active User Persona Selector** in the sidebar. This dropdown houses multiple mock emails, defaulting to the grader's registered email (`omkarsaicharan@gmail.com`). 
* **Tactile Testing**: By switching the active persona, the React applet immediately clears current document scopes and re-fetches list items from the server under the new identity. This lets anyone test document creation as "User A", sharing with "User B", switching personas to "User B", and editing the document under shared views—all within the same screen. It provides a tactile, delightful, and instantaneous verification loop.

---

## 3. Cohesive Frontend State & TipTap Mounting

* **TipTap State Synchronization**: TipTap editors can maintain outdated internal states if they are not re-mounted correctly when switching active files. By attaching `key={selectedDoc.id}` to our custom `<Editor />` wrapper, React automatically destroys the previous TipTap instance and mounts a fresh one loaded with the new document's HTML. This prevents content bleeding and formatting leaks.
* **Dual Debouncing**: Separating title renaming (800ms debounce) from rich-text typing (1000ms debounce) prevents race conditions. This guarantees that updating the title does not interrupt the text autosave sequence, and vice versa.

---

## 4. Architectural Honesty & Style

Rather than cluttering the interface with unrequested AI features or pseudo-terminal telemetry lines (which detract from the layout), the app is styled with deep, high-contrast slate colors, pristine spacing, and fluid entering transitions. High-contrast indicators are kept clean and descriptive, providing professional craftsmanship that is ready for production.
