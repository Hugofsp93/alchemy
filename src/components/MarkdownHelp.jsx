import { useState } from "react";
import { CircleHelp } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

function MarkdownHelp() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
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
            <Dialog.Close asChild>
              <button className="btn-modal btn-cancel">Close Grimoire</button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default MarkdownHelp;
