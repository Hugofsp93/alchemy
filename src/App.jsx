import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Moon, Sun, SquarePen, Trash2, FileText, Kanban } from "lucide-react";
import "./App.css";

function App() {
  const [documents, setDocuments] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  // Ref para evitar loop de salvamento
  const savingRef = useRef(false);

  // Sincroniza o atributo data-theme no body
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

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

  // Função core de salvamento
  const saveDoc = async (oldId, doc) => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      const newId = await invoke("save_document", { oldId, doc });
      if (newId !== oldId) {
        // Se o título mudou, o backend renomeou o arquivo. 
        // Atualizamos o ID no frontend para manter a sincronia.
        setDocuments(prev => prev.map(d => d.id === oldId ? { ...d, id: newId } : d));
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
    // Pega o número total de notas e soma 1. Pad com zeros à esquerda (4 dígitos).
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

    // Só disparamos o salvamento se o documento existir e o título resultante não for vazio
    const currentDoc = documents.find((d) => d.id === id);
    if (currentDoc) {
      const nextDoc = { ...currentDoc, ...updates, updatedAt: Date.now() };
      if (nextDoc.title.trim() !== "") {
        saveDoc(id, nextDoc);
      }
    }

    // Salvamento imediato simplificado (podemos adicionar debounce depois se necessário)
    const docToSave = documents.find(d => d.id === id);
    if (docToSave) {
      saveDoc(id, { ...docToSave, ...updates, updatedAt: Date.now() });
    }
  };

  const deleteDocument = (id) => {
    if (window.confirm("Tem certeza que deseja excluir esta nota?")) {
      invoke("delete_document", { id }).catch(console.error);
      setDocuments(documents.filter((doc) => doc.id !== id));
      if (activeDocId === id) {
        const remaining = documents.filter((doc) => doc.id !== id);
        setActiveDocId(remaining.length > 0 ? remaining[0].id : null);
      }
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <header className="sidebar-header">
          <div className="sidebar-logo-placeholder">NoteBan</div>
          <button className="new-note-btn" onClick={createNewNote} title="Nova nota">
            <SquarePen size={18} />
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
                <span className="sidebar-item-icon">
                  {doc.type === "note" ? <FileText size={14} /> : <Kanban size={14} />}
                </span>
                <span className="sidebar-item-title">
                  {doc.title.trim() === "" ? "Sem título" : doc.title}
                </span>
              </div>
            ))
          )}
        </nav>

        <footer className="sidebar-footer">
          <button
            className="theme-toggle"
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </footer>
      </aside>

      <main className="content-area">
        {!activeDoc ? (
          <p className="empty-state">Selecione ou crie uma nota</p>
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
            <footer className="editor-footer">
              <button
                className="delete-btn"
                onClick={() => deleteDocument(activeDocId)}
                title="Excluir nota"
              >
                <Trash2 size={18} />
              </button>
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
