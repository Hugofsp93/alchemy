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

  // Sincroniza tema e janela nativa
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDarkMode ? "dark" : "light");
    getCurrentWindow().setTheme(isDarkMode ? "dark" : "light").catch(console.error);
  }, [isDarkMode]);

  // Atalho Cmd + B
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const activeDoc = useMemo(() => documents.find((doc) => doc.id === activeDocId), [documents, activeDocId]);

  const sortedDocs = useMemo(() => {
    return [...documents].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [documents]);

  // Load inicial
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

  const saveDocToDisk = async (oldId, doc) => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      const newId = await invoke("save_document", { oldId, doc });
      // Se o backend atribuiu um novo ID (ex: migração de .md legado), atualiza no estado
      if (newId !== doc.id) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, id: newId } : d))
        );
        setActiveDocId(newId);
      }
    } catch (err) {
      console.error("Erro ao salvar no disco:", err);
    } finally {
      savingRef.current = false;
    }
  };

  const debouncedSave = (id, doc) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveDocToDisk(id, doc);
    }, 500);
  };

  const createNewNote = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    // Gerar um ID temporário ou deixar o backend gerar via Save
    // Aqui geramos o ID no frontend para garantir unicidade absoluta imediata
    const newId = crypto.randomUUID();

    // Calcular o próximo número para o título NoteBan XXXX
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
    saveDocToDisk("", newDoc); // oldId vazio pois é nova
  };

  const updateDocument = (id, updates) => {
    let updatedDocForSave = null;
    const now = Date.now();

    setDocuments((prev) => {
      return prev.map((doc) => {
        if (doc.id === id) {
          const newDoc = { ...doc, ...updates, updatedAt: now };
          updatedDocForSave = newDoc;
          return newDoc;
        }
        return doc;
      });
    });

    if (updatedDocForSave) {
      if (updates.title !== undefined) {
        // Títulos podem ser iguais agora, sem problemas de colisão de ID
        debouncedSave(id, updatedDocForSave);
      } else if (updates.content !== undefined) {
        debouncedSave(id, updatedDocForSave);
      }
    }
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

  return (
    <div className={`app-container ${!isSidebarOpen ? "sidebar-closed" : ""}`}>
      <aside className="sidebar">
        <header className="sidebar-header">
          <button className="new-note-btn" onClick={createNewNote} title="Nova nota">
            <SquarePen size={18} />
          </button>
        </header>

        <nav className="sidebar-list">
          {sortedDocs.length === 0 ? (
            <p className="empty-state">Nenhuma nota ainda</p>
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
                      {doc.title.trim() === "" ? "Sem título" : doc.title}
                    </div>
                    <div className="sidebar-item-preview">
                      {getPreviewText(doc.content) || "Empty"}
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
            title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <Dialog.Root open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <Dialog.Trigger asChild>
              <button
                className="footer-btn delete-btn"
                title="Excluir nota"
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
                <Dialog.Title className="DialogTitle">Excluir Nota?</Dialog.Title>
                <Dialog.Description className="DialogDescription">
                  Esta ação é permanente e não poderá ser desfeita. Deseja realmente banir esta nota?
                </Dialog.Description>
                <div className="DialogActions">
                  <Dialog.Close asChild>
                    <button className="btn-modal btn-cancel">Cancelar</button>
                  </Dialog.Close>
                  <button className="btn-modal btn-delete" onClick={handleConfirmDelete}>
                    Excluir
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
            <p className="empty-state">Selecione ou crie uma nota</p>
          </div>
        ) : (
          <div className="editor-container">
            <input
              className="editor-title"
              value={activeDoc.title}
              onChange={(e) =>
                updateDocument(activeDocId, { title: e.target.value })
              }
              placeholder="Título"
            />
            <textarea
              className="editor-content"
              value={activeDoc.content}
              onChange={(e) =>
                updateDocument(activeDocId, { content: e.target.value })
              }
              placeholder="Que alquimia você vai realizar hoje?"
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
