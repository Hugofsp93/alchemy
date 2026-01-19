import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, SquarePen, PanelLeftClose } from "lucide-react";
import MarkdownHelp from "./MarkdownHelp";
import DeleteNoteDialog from "./DeleteNoteDialog";
import { formatDate } from "../utils/dateUtils";

function Sidebar({
  onToggleOpen,
  onNewNote,
  documents,
  activeDocId,
  onSelectDoc,
  isDarkMode,
  onToggleTheme,
  onDeleteDoc, // async function that takes id
}) {

  const getPreviewText = (content) => {
    return content.replace(/[#*`_~]/g, "").trim().substring(0, 60);
  };

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <div className="drag-region" data-tauri-drag-region />
        <button className="new-note-btn" onClick={onToggleOpen} title="Hide sidebar (⌘B)">
          <PanelLeftClose size={22} />
        </button>
        <button className="new-note-btn" onClick={onNewNote} title="New note (⌘T)">
          <SquarePen size={22} />
        </button>
      </header>

      <nav className="sidebar-list">
        {documents.length === 0 ? (
          <p className="empty-state">The library is empty</p>
        ) : (
          <AnimatePresence initial={true}>
            {documents.map((doc) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10, transition: { duration: 0.15 } }}
                key={doc.id}
                className={`sidebar-item ${doc.id === activeDocId ? "active" : ""}`}
                onClick={() => onSelectDoc(doc.id)}
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
        <div className="footer-left-btns">
          <button className="footer-btn theme-toggle" onClick={onToggleTheme}>
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <MarkdownHelp />
        </div>

        <DeleteNoteDialog activeDocId={activeDocId} onDeleteDoc={onDeleteDoc} />
      </footer>
    </aside>
  );
}

export default Sidebar;
