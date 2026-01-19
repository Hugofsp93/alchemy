import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, SquarePen, Trash2, Wand2, PanelLeftClose, CircleHelp } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

function Sidebar({
  isOpen,
  onToggleOpen,
  onNewNote,
  documents,
  activeDocId,
  onSelectDoc,
  isDarkMode,
  onToggleTheme,
  onDeleteDoc, // async function that takes id
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const getPreviewText = (content) => {
    return content.replace(/[#*`_~]/g, "").trim().substring(0, 60);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();

    // Check if it's today by comparing date strings
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Yesterday"; // Fallback for edge cases across midnight
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return "A week ago";
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 60) return "A month ago";
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

    return "Over a year ago";
  };

  const handleConfirmDelete = async () => {
    if (onDeleteDoc && activeDocId) {
      await onDeleteDoc(activeDocId);
      setIsDeleteDialogOpen(false);
    }
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

          <Dialog.Root open={isHelpOpen} onOpenChange={setIsHelpOpen}>
            <Dialog.Trigger asChild>
              <button className="footer-btn help-btn" title="Markdown Cheat Sheet">
                <CircleHelp size={16} />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="DialogOverlay" />
              <Dialog.Content className="DialogContent HelpDialogContent">
                <Dialog.Title className="DialogTitle">Markdown Magic</Dialog.Title>
                <Dialog.Description className="DialogDescription">
                  Common spells to format your scrolls.
                </Dialog.Description>

                <div className="help-grid">
                  <div className="help-item">
                    <code># Title</code>
                    <span>Heading 1</span>
                  </div>
                  <div className="help-item">
                    <code>## Title</code>
                    <span>Heading 2</span>
                  </div>
                  <div className="help-item">
                    <code>### Title</code>
                    <span>Heading 3</span>
                  </div>
                  <div className="help-item">
                    <code>#### Title</code>
                    <span>Heading 4</span>
                  </div>
                  <div className="help-item">
                    <code>**Bold**</code>
                    <span style={{ fontWeight: 'bold' }}>Bold</span>
                  </div>
                  <div className="help-item">
                    <code>*Italic*</code>
                    <span style={{ fontStyle: 'italic' }}>Italic</span>
                  </div>
                  <div className="help-item">
                    <code>~~Strike~~</code>
                    <span style={{ textDecoration: 'line-through' }}>Strike</span>
                  </div>
                  <div className="help-item">
                    <code>- List</code>
                    <span>Bullet list</span>
                  </div>
                  <div className="help-item">
                    <code>1. List</code>
                    <span>Ordered list</span>
                  </div>
                  <div className="help-item">
                    <code>[ ] Task</code>
                    <span>Checklist</span>
                  </div>
                  <div className="help-item">
                    <code>&gt; Quote</code>
                    <span>Blockquote</span>
                  </div>
                  <div className="help-item">
                    <code>`Code`</code>
                    <span style={{ fontFamily: 'monospace' }}>Inline Code</span>
                  </div>
                  <div className="help-item">
                    <code>```js</code>
                    <span>Code Block</span>
                  </div>
                  <div className="help-item">
                    <code>[Link](url)</code>
                    <span>Link</span>
                  </div>
                  <div className="help-item">
                    <code>![Alt](url)</code>
                    <span>Image</span>
                  </div>
                  <div className="help-item">
                    <code>---</code>
                    <span>Divider</span>
                  </div>
                </div>

                <div className="DialogActions">
                  <Dialog.Close asChild><button className="btn-modal btn-cancel">Close Grimoire</button></Dialog.Close>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>

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
  );
}

export default Sidebar;
