import { useState } from "react";
import "./App.css";

function App() {
  const [documents, setDocuments] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);

  return (
    <div className="app-container">
      <aside className="sidebar">
        <header className="sidebar-header">
          <h1>NoteBan</h1>
        </header>
        <nav className="sidebar-list">
          {/* Lista de documentos virá aqui */}
          <p className="empty-state">Nenhuma nota ainda</p>
        </nav>
      </aside>
      <main className="content-area">
        {/* Editor virá aqui */}
        <p className="empty-state">Selecione ou crie uma nota</p>
      </main>
    </div>
  );
}

export default App;
