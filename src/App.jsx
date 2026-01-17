import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, SquarePen, Trash2, Wand2, PanelLeftClose } from "lucide-react";

// Mage Icons - Selected Council
import magePurple from "./assets/mage_purple.png";
import mageRed from "./assets/mage_red.png";
import mageOrange from "./assets/mage_orange.png";
import mageDarkGray from "./assets/mage_dark_gray.png";

import "./App.css";

const MAGE_THEMES = [
  { id: "purple", icon: magePurple, color: "#64448b" },
  { id: "red", icon: mageRed, color: "#e53935" },
  { id: "orange", icon: mageOrange, color: "#f57c00" },
  { id: "dark_gray", icon: mageDarkGray, color: "#455a64" },
];

function App() {
  const [documents, setDocuments] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  // Mage Theme State
  const [mageTheme, setMageTheme] = useState(localStorage.getItem("alchemy-mage-theme") || "purple");
  const [isMageSplashOpen, setIsMageSplashOpen] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const savingRef = useRef(false);
  const saveTimeoutRef = useRef(null);
  const isDirtyRef = useRef(false);
  const isExitingRef = useRef(false); // Blocks other saves when exiting

  // DOM Refs for direct access during final Flush
  const titleInputRef = useRef(null);
  const contentTextAreaRef = useRef(null);

  // Ref for the current document object
  const currentDocRef = useRef(null);

  // Ref to always have latest documents for keyboard shortcuts
  const documentsRef = useRef([]);

  // Sync theme and Mage theme with root element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDarkMode ? "dark" : "light");
    document.documentElement.setAttribute("data-mage-theme", mageTheme);
    localStorage.setItem("alchemy-mage-theme", mageTheme);
    getCurrentWindow().setTheme(isDarkMode ? "dark" : "light").catch(console.error);
  }, [isDarkMode, mageTheme]);

  // CLOSE INTERCEPTOR (FULL FLUSH)
  useEffect(() => {
    let unlisten;

    const setupCloseListener = async () => {
      const window = getCurrentWindow();
      unlisten = await window.onCloseRequested((event) => {
        if (isDirtyRef.current || savingRef.current) {
          event.preventDefault();
          if (isExitingRef.current) return;
          isExitingRef.current = true;

          console.log("⚠️ CLOSE DETECTED: Starting direct DOM flush...");

          (async () => {
            if (currentDocRef.current) {
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
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                await invoke("save_document", { oldId: flushDoc.id, doc: flushDoc });
                console.log("✅ Flush complete. Exiting app.");
              } catch (e) {
                console.error("❌ Fatal error in final flush:", e);
              }
            }

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

  // Shortcuts Cmd + B, Cmd + S, Cmd + T
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "t") {
        e.preventDefault();
        createNewNote();
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
        documentsRef.current = docs;
        if (docs.length > 0 && !activeDocId) {
          setActiveDocId(docs[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // FOCUS REFRESH
  useEffect(() => {
    const handleFocus = async () => {
      try {
        const diskDocs = await invoke("list_documents");
        setDocuments((currentDocs) => {
          const validIds = new Set(diskDocs.map((d) => d.id));
          const preservedDocs = currentDocs.filter((doc) => validIds.has(doc.id));
          const currentIds = new Set(currentDocs.map((d) => d.id));
          const newDocs = diskDocs.filter((d) => !currentIds.has(d.id));
          if (preservedDocs.length === currentDocs.length && newDocs.length === 0) return currentDocs;
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
    const currentDocs = documentsRef.current;
    const numbers = currentDocs.map((doc) => {
      const match = doc.title.match(/Alchemy\s+(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    const noteNumberString = String(nextNumber).padStart(4, "0");
    const newTitle = `Alchemy ${noteNumberString}`;
    const maxExistingTimestamp = currentDocs.reduce((max, d) => Math.max(max, d.updatedAt), 0);
    const timestamp = Math.max(Date.now(), maxExistingTimestamp + 1);
    const newDoc = { id: newId, title: newTitle, type: "note", content: "", updatedAt: timestamp };
    setDocuments((prev) => {
      const updated = [newDoc, ...prev];
      documentsRef.current = updated;
      return updated;
    });
    setActiveDocId(newId);
    currentDocRef.current = newDoc;
    saveDocToDisk("", newDoc);
  };

  const updateDocument = (id, updates) => {
    const docIndex = documents.findIndex((d) => d.id === id);
    if (docIndex === -1) return;
    const oldDoc = documents[docIndex];
    const now = Date.now();
    const newDoc = { ...oldDoc, ...updates, updatedAt: now };
    currentDocRef.current = newDoc;
    setDocuments((prev) => {
      const newAll = [...prev];
      const idx = newAll.findIndex((d) => d.id === id);
      if (idx !== -1) newAll[idx] = newDoc;
      documentsRef.current = newAll;
      return newAll;
    });
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
        documentsRef.current = remaining;
        return remaining;
      });
      setIsDeleteDialogOpen(false);
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  const getPreviewText = (content) => {
    return content.replace(/[#*`_~]/g, "").trim().substring(0, 60);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { day: '2-digit', month: 'short' }).replace(".", "");
  };

  const currentMageIcon = useMemo(() => {
    return MAGE_THEMES.find(t => t.id === mageTheme)?.icon || magePurple;
  }, [mageTheme]);

  return (
    <div className={`app-container ${!isSidebarOpen ? "sidebar-closed" : ""}`}>
      <aside className="sidebar">
        <header className="sidebar-header">
          <button className="new-note-btn" onClick={() => setIsSidebarOpen(false)} title="Hide sidebar (⌘B)">
            <PanelLeftClose size={18} />
          </button>
          <button className="new-note-btn" onClick={createNewNote} title="New note">
            <SquarePen size={18} />
          </button>
        </header>

        <nav className="sidebar-list">
          {sortedDocs.length === 0 ? (
            <p className="empty-state">The library is empty</p>
          ) : (
            <AnimatePresence initial={true}>
              {sortedDocs.map((doc) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10, transition: { duration: 0.15 } }}
                  key={doc.id}
                  className={`sidebar-item ${doc.id === activeDocId ? "active" : ""}`}
                  onClick={() => setActiveDocId(doc.id)}
                >
                  <div className="sidebar-item-marker" />
                  <div className="sidebar-item-info">
                    <div className="sidebar-item-title">{doc.title.trim() === "" ? "Untitled" : doc.title}</div>
                    <div className="sidebar-item-preview">{getPreviewText(doc.content) || "Blank parchment"}</div>
                    <div className="sidebar-item-date">{formatDate(doc.updatedAt)}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </nav>

        <footer className="sidebar-footer">
          <button className="footer-btn theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <Dialog.Root open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <Dialog.Trigger asChild>
              <button className="footer-btn delete-btn" disabled={!activeDocId}>
                <Trash2 size={16} />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="DialogOverlay" />
              <Dialog.Content
                className="DialogContent"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirmDelete();
                  }
                }}
              >
                <div className="DialogIcon"><Wand2 size={40} /></div>
                <Dialog.Title className="DialogTitle">Delete Note?</Dialog.Title>
                <Dialog.Description className="DialogDescription">
                  This spell is irreversible. Banish this scroll to the void?
                </Dialog.Description>
                <div className="DialogActions">
                  <Dialog.Close asChild><button className="btn-modal btn-cancel">Cancel</button></Dialog.Close>
                  <button className="btn-modal btn-delete" onClick={handleConfirmDelete}>Delete</button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </footer>
      </aside>

      <main className="content-area">
        {!activeDoc ? (
          <div className="empty-view"><p className="empty-state">Choose a scroll or conjure a new one</p></div>
        ) : (
          <div className="editor-container">
            <input
              ref={titleInputRef}
              className="editor-title"
              value={activeDoc.title}
              onChange={(e) => updateDocument(activeDocId, { title: e.target.value })}
              placeholder="Title"
            />
            <textarea
              ref={contentTextAreaRef}
              className="editor-content"
              value={activeDoc.content}
              onChange={(e) => updateDocument(activeDocId, { content: e.target.value })}
              placeholder="What kind of sorcery will you perform today?"
              autoFocus
            />
          </div>
        )}

        {/* The Council of Mages Theme Switcher */}
        <div className="mage-presence-container">
          <AnimatePresence>
            {isMageSplashOpen && (
              <motion.div
                className="mage-splash-overlay"
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
              >
                {MAGE_THEMES.map((theme) => (
                  <div
                    key={theme.id}
                    className={`mage-option ${mageTheme === theme.id ? "active" : ""}`}
                    onClick={() => {
                      setMageTheme(theme.id);
                      setIsMageSplashOpen(false);
                    }}
                  >
                    <img src={theme.icon} alt={`${theme.id} mage`} />
                  </div>
                ))}
              </motion.div>
            )}
            <img
              src={currentMageIcon}
              alt="Council Logo"
              className="editor-logo"
              onClick={() => setIsMageSplashOpen(!isMageSplashOpen)}
            />
          </AnimatePresence>
        </div>
        {/* Click-outside overlay to close mage splash */}
        {isMageSplashOpen && (
          <div
            className="mage-splash-backdrop"
            onClick={() => setIsMageSplashOpen(false)}
          />
        )}
      </main>
    </div>
  );
}

export default App;
