import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Moon, Sun, SquarePen, Trash2, FileText, Kanban } from "lucide-react";
import logo from "./assets/mage.png";
import "./App.css";

function App() {
  const [documents, setDocuments] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  const savingRef = useRef(false);

  // Sincroniza o atributo data-theme no body
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  // Atalho Cmd + B para fechar/abrir a sidebar
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

  const activeDoc = documents.find((doc) => doc.id === activeDocId);
  const sortedDocs = [...documents].sort((a, b) => b.updatedAt - a.updatedAt);

  // Carrega documentos
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

  const saveDoc = async (oldId, doc) => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      const newId = await invoke("save_document", { oldId, doc });
      if (newId !== oldId) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === oldId ? { ...d, id: newId } : d))
        );
        setActiveDocId(newId);
      }
    } catch (err) {
      console.error("Erro ao salvar:", err);
    } finally {
      savingRef.current = false;
    }
  };

  const createNewNote = () => {
    const timestamp = Date.now();
    const noteNumber = String(documents.length + 1).padStart(4, "0");
    const newId = `NoteBan ${noteNumber}`;
    const newDoc = {
      id: newId,
      title: newId,
      type: "note",
      content: "",
      updatedAt: timestamp,
    };
    setDocuments([newDoc, ...documents]);
    setActiveDocId(newDoc.id);
    saveDoc(newDoc.id, newDoc);
  };

  const updateDocument = (id, updates) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === id ? { ...doc, ...updates, updatedAt: Date.now() } : doc
      )
    );

    const currentDoc = documents.find((d) => d.id === id);
    if (currentDoc) {
      const nextDoc = { ...currentDoc, ...updates, updatedAt: Date.now() };
      if (nextDoc.title.trim() !== "") {
        saveDoc(id, nextDoc);
      }
    }
  };

  const deleteDocument = (id) => {
    if (!id) {
      console.warn("Nenhum id fornecido para exclusão");
      return;
    }

    if (window.confirm("Tem certeza que deseja excluir esta nota?")) {
      invoke("delete_document", { id })
        .then(() => {
          const remaining = documents.filter((doc) => doc.id !== id);
          setDocuments(remaining);
          setActiveDocId(remaining.length > 0 ? remaining[0].id : null);
        })
        .catch(err => {
          console.error("Erro ao excluir documento:", err);
          alert("Erro ao excluir a nota.");
        });
    }
  };

  // Helper para limpar markdown do preview
  const getPreviewText = (content) => {
    return content
      .replace(/[#*`_~]/g, "") // Remove símbolos básicos de markdown
      .trim()
      .substring(0, 70);
  };

  return (
    <div className={`app-container ${!isSidebarOpen ? "sidebar-closed" : ""}`}>
      <aside className="sidebar">
        <header className="sidebar-header">
          <img src={logo} alt="NoteBan Logo" className="sidebar-logo" />
          <button className="new-note-btn" onClick={createNewNote} title="Nova nota">
            < SquarePen size={18} />
          </button>
        </header>

        <nav className="sidebar-list">
          {sortedDocs.length === 0 ? (
            <p className="empty-state">Nenhuma nota ainda</p>
          ) : (
            sortedDocs.map((doc) => (
              <div
                key={doc.id}
                className={`sidebar-item ${doc.id === activeDocId ? "active" : ""}`}
                onClick={() => setActiveDocId(doc.id)}
              >
                <div className="sidebar-item-info">
                  <div className="sidebar-item-title">
                    {doc.title.trim() === "" ? "Sem título" : doc.title}
                  </div>
                  <div className="sidebar-item-preview">
                    {getPreviewText(doc.content) || "Empty"}
                  </div>
                </div>
              </div>
            ))
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

          <button
            className="footer-btn delete-btn"
            onClick={() => deleteDocument(activeDocId)}
            disabled={!activeDocId}
            title="Excluir nota"
          >
            <Trash2 size={16} />
          </button>
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
              placeholder="Comece a escrever em Markdown..."
              autoFocus
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
