import { useState } from "react";
import Sidebar from "./components/Sidebar";
import ContentArea from "./components/ContentArea";

// Hooks
import { useTheme } from "./hooks/useTheme";
import { useDocuments } from "./hooks/useDocuments";
import { useAutoSave } from "./hooks/useAutoSave";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

import "./App.css";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { isDarkMode, toggleTheme, mageTheme, setMageTheme } = useTheme();

  const {
    setDocuments,
    activeDocId,
    setActiveDocId,
    activeDoc,
    sortedDocs,
    documentsRef,
    createNoteState,
    updateDocState,
    deleteDocState
  } = useDocuments();

  const {
    saveDocToDisk,
    debouncedSave,
    currentDocRef,
    titleInputRef,
    editorRef,
    saveTimeoutRef
  } = useAutoSave(documentsRef, setDocuments, setActiveDocId);

  const handleCreateNote = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const newDoc = createNoteState();
    currentDocRef.current = newDoc;
    saveDocToDisk("", newDoc);
  };

  const handleUpdateDocument = (id, updates) => {
    const newDoc = updateDocState(id, updates);

    if (newDoc) {
      currentDocRef.current = newDoc;
      debouncedSave(id, newDoc);
    }
  };

  useKeyboardShortcuts({
    setIsSidebarOpen,
    createNewNote: handleCreateNote,
    saveDocToDisk,
    currentDocRef,
    titleInputRef,
    editorRef
  });

  return (
    <div className={`app-container ${!isSidebarOpen ? "sidebar-closed" : ""}`}>
      <Sidebar
        isOpen={isSidebarOpen}
        onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
        onNewNote={handleCreateNote}
        documents={sortedDocs}
        activeDocId={activeDocId}
        onSelectDoc={setActiveDocId}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        onDeleteDoc={deleteDocState}
      />

      <ContentArea
        activeDoc={activeDoc}
        activeDocId={activeDocId}
        updateDocument={handleUpdateDocument}
        titleInputRef={titleInputRef}
        editorRef={editorRef}
        mageTheme={mageTheme}
        setMageTheme={setMageTheme}
      />
    </div>
  );
}

export default App;
