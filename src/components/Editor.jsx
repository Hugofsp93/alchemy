import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import Placeholder from '@tiptap/extension-placeholder';
import { forwardRef, useImperativeHandle, useEffect } from 'react';
import { marked } from 'marked';

const NoTab = Extension.create({
  name: 'noTab',
  addKeyboardShortcuts() {
    return {
      'Tab': () => true,
    };
  },
});

const Editor = forwardRef(({ content, onUpdate, placeholder }, ref) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Markdown,
      Placeholder.configure({
        placeholder: placeholder || 'Start writing...',
      }),
      NoTab,
    ],
    // Parse markdown to HTML for Tiptap's initial state
    content: marked.parse(content || ''),
    onUpdate: ({ editor }) => {
      // Get markdown back from Tiptap to save
      const md = editor.getMarkdown();
      onUpdate(md);
    },
  });

  // Expose editor methods to parent via ref
  useImperativeHandle(ref, () => ({
    getMarkdown: () => editor?.getMarkdown() || '',
    focus: () => editor?.commands.focus(),
  }));

  // Update content when switching documents
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentMarkdown = editor.getMarkdown();
      if (content !== currentMarkdown) {
        // We must parse markdown to HTML before setting it
        const html = marked.parse(content || '');
        editor.commands.setContent(html);
      }
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <EditorContent
      editor={editor}
      className="tiptap-editor"
    />
  );
});

Editor.displayName = 'Editor';

export default Editor;
