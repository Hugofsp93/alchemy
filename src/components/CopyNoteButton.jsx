import { useState } from "react";
import { Copy, Check } from "lucide-react";

function CopyNoteButton({ activeDoc }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!activeDoc) return;

    // Build the full note content: title + content
    const fullContent = activeDoc.title
      ? `# ${activeDoc.title}\n\n${activeDoc.content || ""}`
      : activeDoc.content || "";

    try {
      await navigator.clipboard.writeText(fullContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy note:", err);
    }
  };

  return (
    <button
      className="footer-btn copy-note-btn"
      onClick={handleCopy}
      disabled={!activeDoc}
      title="Copy note content"
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}

export default CopyNoteButton;
