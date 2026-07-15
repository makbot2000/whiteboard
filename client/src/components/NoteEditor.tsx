import { useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useBoardStore } from '../stores/boardStore';
import type { Note } from '../types';

interface Props {
  note: Note;
}

export default function NoteEditor({ note }: Props) {
  const { updateNote } = useBoardStore();
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSave = useCallback(
    (json: any) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        updateNote(note.id, { content_json: json });
      }, 500);
    },
    [note.id, updateNote]
  );

  const initialContent = (() => {
    try {
      const parsed = JSON.parse(note.content_json || '{}');
      if (parsed.type) return parsed;
      return undefined;
    } catch {
      return undefined;
    }
  })();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Placeholder.configure({ placeholder: 'Start typing...' }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      debouncedSave(editor.getJSON());
    },
  });

  if (!editor) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Mini toolbar */}
      <div className="flex items-center gap-0.5 px-1 py-0.5 border-b border-gray-100 dark:border-gray-700 shrink-0 flex-wrap">
        <ToolBtn
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="B"
          className="font-bold"
        />
        <ToolBtn
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="I"
          className="italic"
        />
        <ToolBtn
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          label="U"
          className="underline"
        />
        <ToolBtn
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          label="S"
          className="line-through"
        />
        <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-0.5" />
        <ToolBtn
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="•"
        />
        <ToolBtn
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="1."
        />
        <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-0.5" />
        <ToolBtn
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          label="H1"
          className="text-[10px]"
        />
        <ToolBtn
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label="H2"
          className="text-[10px]"
        />
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  );
}

function ToolBtn({ active, onClick, label, className = '' }: { active: boolean; onClick: () => void; label: string; className?: string }) {
  return (
    <button
      className={`px-1.5 py-0.5 rounded text-xs ${className} ${
        active ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
      onClick={(e) => { e.preventDefault(); onClick(); }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}
