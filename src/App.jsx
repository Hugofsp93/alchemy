import { useState, useEffect, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Editor from "./components/Editor";
import Sidebar from "./components/Sidebar";
import MageSwitcher from "./components/MageSwitcher";

import "./App.css";

function App() {
  const [documents, setDocuments] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  // Mage Theme State
  const [mageTheme, setMageTheme] = useState(localStorage.getItem("alchemy-mage-theme") || "purple");

  const savingRef = useRef(false);
  const saveTimeoutRef = useRef(null);
  const isDirtyRef = useRef(false);
  const isExitingRef = useRef(false); // Blocks other saves when exiting

  // DOM Refs for direct access during final Flush
  const titleInputRef = useRef(null);
  const editorRef = useRef(null);

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
              const latestContent = editorRef.current?.getMarkdown?.() ?? currentDocRef.current.content;

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
          const latestContent = editorRef.current?.getMarkdown?.() ?? currentDocRef.current.content;
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
          // Update documentsRef to sync numbering
          documentsRef.current = merged;
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

    // Guard against identical content updates
    if (updates.content !== undefined && updates.content === oldDoc.content) return;

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

  const handleDeleteDoc = async (id) => {
    try {
      await invoke("delete_document", { id });
      setDocuments((prev) => {
        const remaining = prev.filter((doc) => doc.id !== id);
        const nextId = remaining.length > 0 ? remaining[0].id : null;
        setActiveDocId(nextId);
        documentsRef.current = remaining;
        return remaining;
      });
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  return (
    <div className={`app-container ${!isSidebarOpen ? "sidebar-closed" : ""}`}>
      <Sidebar
        isOpen={isSidebarOpen}
        onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
        onNewNote={createNewNote}
        documents={sortedDocs}
        activeDocId={activeDocId}
        onSelectDoc={setActiveDocId}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onDeleteDoc={handleDeleteDoc}
      />

      <main className="content-area">
        {!activeDoc ? (
          <div className="empty-view"><p className="empty-state">Choose a scroll or conjure a new one</p></div>
        ) : (
          <div className="editor-container">
            <div className="content-drag-region" data-tauri-drag-region />
            <input
              ref={titleInputRef}
              className="editor-title"
              value={activeDoc.title}
              onChange={(e) => updateDocument(activeDocId, { title: e.target.value })}
              placeholder="Title"
            />
            <Editor
              ref={editorRef}
              key={activeDocId}
              content={activeDoc.content}
              onUpdate={(md) => updateDocument(activeDocId, { content: md })}
              placeholder="What kind of sorcery will you perform today?"
            />
          </div>
        )}

        <MageSwitcher
          currentTheme={mageTheme}
          onThemeChange={setMageTheme}
        />
      </main>
    </div>
  );
}

export default App;
