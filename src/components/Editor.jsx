import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import Placeholder from '@tiptap/extension-placeholder';
import { forwardRef, useImperativeHandle, useEffect } from 'react';

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
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
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
      const currentContent = editor.getMarkdown();
      if (content !== currentContent) {
        editor.commands.setContent(content || '');
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

