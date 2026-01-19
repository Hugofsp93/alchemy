import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { all, createLowlight } from 'lowlight';
import { forwardRef, useImperativeHandle, useEffect, useMemo } from 'react';
import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';

// Create a lowlight instance with all languages loaded
const lowlight = createLowlight(all);

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
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: false, // We use the lowlight extension instead
      }),
      Markdown,
      Placeholder.configure({
        placeholder: placeholder || 'Start writing...',
      }),
      NoTab,
      // Enhanced Markdown Support
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    // Parse markdown to HTML for Tiptap's initial state
    content: new MarkdownIt({ html: true, breaks: true }).use(taskLists).render(content || ''),
    onUpdate: ({ editor }) => {
      // Get markdown back from Tiptap to save
      // Only trigger update if the user is actually editing (focused)
      // This prevents "normalization on load" from marking the doc as dirty
      if (!editor.isFocused) return;

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
        const parser = new MarkdownIt({ html: true, breaks: true }).use(taskLists);
        const html = parser.render(content || '');
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
