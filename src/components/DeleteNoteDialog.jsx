import { useState } from "react";
import { Trash2, Wand2 } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

function DeleteNoteDialog({ activeDocId, onDeleteDoc }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirmDelete = async () => {
    if (onDeleteDoc && activeDocId) {
      await onDeleteDoc(activeDocId);
      setIsOpen(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
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
          <div className="DialogIcon">
            <Wand2 size={40} />
          </div>
          <Dialog.Title className="DialogTitle">Delete Note?</Dialog.Title>
          <Dialog.Description className="DialogDescription">
            This spell is irreversible. Banish this scroll to the void?
          </Dialog.Description>
          <div className="DialogActions">
            <Dialog.Close asChild>
              <button className="btn-modal btn-cancel">Cancel</button>
            </Dialog.Close>
            <button className="btn-modal btn-delete" onClick={handleConfirmDelete}>
              Delete
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default DeleteNoteDialog;
