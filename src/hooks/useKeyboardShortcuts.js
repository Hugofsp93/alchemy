import { useEffect } from "react";

export function useKeyboardShortcuts({
  setIsSidebarOpen,
  createNewNote,
  saveDocToDisk,
  currentDocRef,
  titleInputRef,
  editorRef,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle Sidebar: Cmd+B
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }

      // Save: Cmd+S
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (currentDocRef.current) {
          const latestTitle = titleInputRef.current?.value ?? currentDocRef.current.title;
          const latestContent = editorRef.current?.getMarkdown?.() ?? currentDocRef.current.content;

          const docToSave = {
            ...currentDocRef.current,
            title: latestTitle,
            content: latestContent,
            updatedAt: Date.now()
          };

          saveDocToDisk(docToSave.id, docToSave);
        }
      }

      // New Note: Cmd+T
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "t") {
        e.preventDefault();
        createNewNote();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setIsSidebarOpen, createNewNote, saveDocToDisk]);
}
