import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, SquarePen, Trash2, Wand2 } from "lucide-react";
import logo from "./assets/mage.png";
import "./App.css";

function App() {
  const [documents, setDocuments] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const savingRef = useRef(false);
  const saveTimeoutRef = useRef(null);
  const isDirtyRef = useRef(false);
  const isExitingRef = useRef(false); // Blocks other saves when exiting

  // DOM Refs for direct access during final Flush
  const titleInputRef = useRef(null);
  const contentTextAreaRef = useRef(null);

  // Ref for the current document object (to know ID and other fields during Flush)
  const currentDocRef = useRef(null);

  // Sync theme with native window
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDarkMode ? "dark" : "light");
    getCurrentWindow().setTheme(isDarkMode ? "dark" : "light").catch(console.error);
  }, [isDarkMode]);

  // CLOSE INTERCEPTOR (FULL FLUSH)
  useEffect(() => {
    let unlisten;

    const setupCloseListener = async () => {
      const window = getCurrentWindow();
      unlisten = await window.onCloseRequested((event) => {
        // If pending changes (dirty) or saving
        if (isDirtyRef.current || savingRef.current) {
          event.preventDefault(); // Lock window
          if (isExitingRef.current) return;
          isExitingRef.current = true;

          console.log("⚠️ CLOSE DETECTED: Starting direct DOM flush...");

          (async () => {
            if (currentDocRef.current) {
              // GET VALUES DIRECTLY FROM DOM ELEMENTS
              // Bypasses React state delays!
              const latestTitle = titleInputRef.current?.value ?? currentDocRef.current.title;
              const latestContent = contentTextAreaRef.current?.value ?? currentDocRef.current.content;

              const flushDoc = {
                ...currentDocRef.current,
                title: latestTitle,
                content: latestContent,
                updatedAt: Date.now()
              };

              console.log("💾 Writing final data to disk...");
              try {
                // Cancel pending timeout and call Rust IMMEDIATELY
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                await invoke("save_document", { oldId: flushDoc.id, doc: flushDoc });
                console.log("✅ Flush complete. Exiting app.");
              } catch (e) {
                console.error("❌ Fatal error in final flush:", e);
              }
            }

            // Clear dirty flag and destroy window
            isDirtyRef.current = false;
            await window.destroy();
          })();
        }
      });
    };

    setupCloseListener();
    return () => {
      if (typeof unlisten === 'function') unlisten();
    };
  }, []);

  // Shortcuts Cmd + B and Cmd + S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (currentDocRef.current) {
          const latestTitle = titleInputRef.current?.value ?? currentDocRef.current.title;
          const latestContent = contentTextAreaRef.current?.value ?? currentDocRef.current.content;
          const docToSave = { ...currentDocRef.current, title: latestTitle, content: latestContent, updatedAt: Date.now() };
          saveDocToDisk(docToSave.id, docToSave);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const activeDoc = useMemo(() => documents.find((doc) => doc.id === activeDocId), [documents, activeDocId]);

  const sortedDocs = useMemo(() => {
    return [...documents].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [documents]);

  // Initial Load
  useEffect(() => {
    invoke("list_documents")
      .then((docs) => {
        setDocuments(docs);
        if (docs.length > 0 && !activeDocId) {
          setActiveDocId(docs[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // FOCUS REFRESH: Updates list when window gains focus
  // Syncs external changes (deletes/adds) without overwriting local edits
  useEffect(() => {
    const handleFocus = async () => {
      try {
        const diskDocs = await invoke("list_documents");

        setDocuments((currentDocs) => {
          // 1. Identify IDs still on disk
          const validIds = new Set(diskDocs.map((d) => d.id));

          // 2. Remove externally deleted docs from state
          const preservedDocs = currentDocs.filter((doc) => validIds.has(doc.id));

          // 3. Add externally created docs to state
          const currentIds = new Set(currentDocs.map((d) => d.id));
          const newDocs = diskDocs.filter((d) => !currentIds.has(d.id));

          // Avoid re-render if no changes
          if (preservedDocs.length === currentDocs.length && newDocs.length === 0) {
            return currentDocs;
          }

          const merged = [...preservedDocs, ...newDocs];
          merged.sort((a, b) => b.updatedAt - a.updatedAt);

          return merged;
        });
      } catch (e) {
        console.error("Error syncing on focus:", e);
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const saveDocToDisk = async (oldId, doc) => {
    // Block saves if exiting
    if (savingRef.current || isExitingRef.current) return;

    savingRef.current = true;
    try {
      const newId = await invoke("save_document", { oldId: oldId, doc });
      isDirtyRef.current = false;
      if (newId !== doc.id) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, id: newId } : d))
        );
        setActiveDocId(newId);
      }
      console.log("💾 Document saved successfully.");
    } catch (err) {
      console.error("Error saving to disk:", err);
    } finally {
      savingRef.current = false;
    }
  };

  const debouncedSave = (id, doc) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    isDirtyRef.current = true;
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      saveDocToDisk(id, doc);
    }, 500);
  };

  const createNewNote = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const newId = crypto.randomUUID();

    const numbers = documents.map((doc) => {
      const match = doc.title.match(/NoteBan\s+(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    const noteNumberString = String(nextNumber).padStart(4, "0");
    const newTitle = `NoteBan ${noteNumberString}`;

    const maxExistingTimestamp = documents.reduce((max, d) => Math.max(max, d.updatedAt), 0);
    const timestamp = Math.max(Date.now(), maxExistingTimestamp + 1);

    const newDoc = {
      id: newId,
      title: newTitle,
      type: "note",
      content: "",
      updatedAt: timestamp,
    };

    setDocuments((prev) => [newDoc, ...prev]);
    setActiveDocId(newId);
    currentDocRef.current = newDoc;
    saveDocToDisk("", newDoc);
  };

  const updateDocument = (id, updates) => {
    // 1. Seek and update the document in the current list
    const docIndex = documents.findIndex((d) => d.id === id);
    if (docIndex === -1) return;

    const oldDoc = documents[docIndex];
    const now = Date.now();
    const newDoc = { ...oldDoc, ...updates, updatedAt: now };

    // 2. Cmd+Q listener
    currentDocRef.current = newDoc;

    setDocuments((prev) => {
      const newAll = [...prev];
      // batch updates
      const idx = newAll.findIndex((d) => d.id === id);
      if (idx !== -1) {
        newAll[idx] = newDoc;
      }
      return newAll;
    });

    // 4. schedule auto-save
    debouncedSave(id, newDoc);
  };

  const handleConfirmDelete = async () => {
    if (!activeDocId) return;
    try {
      await invoke("delete_document", { id: activeDocId });
      setDocuments((prev) => {
        const remaining = prev.filter((doc) => doc.id !== activeDocId);
        const nextId = remaining.length > 0 ? remaining[0].id : null;
        setActiveDocId(nextId);
        return remaining;
      });
      setIsDeleteDialogOpen(false);
    } catch (err) {
      console.error("Erro ao excluir:", err);
    }
  };

  const getPreviewText = (content) => {
    return content
      .replace(/[#*`_~]/g, "")
      .trim()
      .substring(0, 60);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { day: '2-digit', month: 'short' }).replace(".", "");
    }
  };

  return (
    <div className={`app-container ${!isSidebarOpen ? "sidebar-closed" : ""}`}>
      <aside className="sidebar">
        <header className="sidebar-header">
          <button className="new-note-btn" onClick={createNewNote} title="New note">
            <SquarePen size={18} />
          </button>
        </header>

        <nav className="sidebar-list">
          {sortedDocs.length === 0 ? (
            <p className="empty-state">No notes yet</p>
          ) : (
            <AnimatePresence initial={true}>
              {sortedDocs.map((doc) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10, transition: { duration: 0.15 } }}
                  transition={{
                    layout: { type: "tween", ease: "easeOut", duration: 0.25 },
                    opacity: { duration: 0.2 },
                    y: { duration: 0.2 }
                  }}
                  key={doc.id}
                  className={`sidebar-item ${doc.id === activeDocId ? "active" : ""}`}
                  onClick={() => setActiveDocId(doc.id)}
                >
                  <div className="sidebar-item-marker" />
                  <div className="sidebar-item-info">
                    <div className="sidebar-item-title">
                      {doc.title.trim() === "" ? "Untitled" : doc.title}
                    </div>
                    <div className="sidebar-item-preview">
                      {getPreviewText(doc.content) || ""}
                    </div>
                    <div className="sidebar-item-date">
                      {formatDate(doc.updatedAt)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </nav>

        <footer className="sidebar-footer">
          <button
            className="footer-btn theme-toggle"
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? "Light Mode" : "Dark Mode"}
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <Dialog.Root open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <Dialog.Trigger asChild>
              <button
                className="footer-btn delete-btn"
                title="Delete note"
                disabled={!activeDocId}
              >
                <Trash2 size={16} />
              </button>
            </Dialog.Trigger>

            <Dialog.Portal>
              <Dialog.Overlay className="DialogOverlay" />
              <Dialog.Content className="DialogContent">
                <div className="DialogIcon">
                  <Wand2 size={40} />
                </div>
                <Dialog.Title className="DialogTitle">Delete Note?</Dialog.Title>
                <Dialog.Description className="DialogDescription">
                  This action is permanent and cannot be undone. Are you sure you want to ban this note?
                </Dialog.Description>
                <div className="DialogActions">
                  <Dialog.Close asChild>
                    <button className="btn-modal btn-cancel">Cancel</button>
                  </Dialog.Close>
                  <button className="btn-modal btn-delete" onClick={handleConfirmDelete}>
                    Delete
                  </button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </footer>
      </aside>

      <main className="content-area">
        {!activeDoc ? (
          <div className="empty-view">
            <p className="empty-state">Select or create a note</p>
          </div>
        ) : (
          <div className="editor-container">
            <input
              ref={titleInputRef}
              className="editor-title"
              value={activeDoc.title}
              onChange={(e) =>
                updateDocument(activeDocId, { title: e.target.value })
              }
              placeholder="Title"
            />
            <textarea
              ref={contentTextAreaRef}
              className="editor-content"
              value={activeDoc.content}
              onChange={(e) =>
                updateDocument(activeDocId, { content: e.target.value })
              }
              placeholder="What alchemy will you perform today?"
              autoFocus
            />
            <img src={logo} alt="NoteBan Logo" className="editor-logo" />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
