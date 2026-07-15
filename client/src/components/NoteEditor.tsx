import { useCallback, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { useBoardStore } from '../stores/boardStore';
import type { Note } from '../types';

interface Props {
  note: Note;
}

const TEXT_COLORS = [
  '#000000', '#374151', '#dc2626', '#ea580c', '#ca8a04',
  '#16a34a', '#2563eb', '#7c3aed', '#db2777', '#ffffff',
];

const BG_COLORS = [
  'transparent', '#fef3c7', '#dcfce7', '#dbeafe', '#f3e8ff',
  '#fce7f3', '#fee2e2', '#e0e7ff', '#ccfbf1', '#f1f5f9',
];

export default function NoteEditor({ note }: Props) {
  const { updateNote } = useBoardStore();
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showTextColor, setShowTextColor] = useState(false);
  const [showBgColor, setShowBgColor] = useState(false);

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
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
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
      <div className="flex items-center gap-0.5 px-1 py-0.5 border-b border-gray-100 dark:border-gray-700 shrink-0 flex-wrap relative">
        {/* Paragraph / Normal */}
        <ToolBtn
          active={editor.isActive('paragraph') && !editor.isActive('heading')}
          onClick={() => editor.chain().focus().setParagraph().run()}
          label="P"
          title="Normal paragraph"
        />
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

        <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-0.5" />

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

        {/* Text color picker */}
        <div className="relative">
          <button
            className={`px-1.5 py-0.5 rounded text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 ${showTextColor ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
            onClick={(e) => { e.preventDefault(); setShowTextColor(!showTextColor); setShowBgColor(false); }}
            onMouseDown={(e) => e.preventDefault()}
            title="Text color"
          >
            <span className="border-b-2" style={{ borderColor: editor.getAttributes('textStyle').color || '#000' }}>A</span>
          </button>
          {showTextColor && (
            <div className="absolute top-6 left-0 z-[200] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-lg p-1.5 grid grid-cols-5 gap-1 min-w-[100px]">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color}
                  className="w-5 h-5 rounded border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    editor.chain().focus().setColor(color).run();
                    setShowTextColor(false);
                  }}
                />
              ))}
              <button
                className="col-span-5 text-[10px] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-1 py-0.5 mt-0.5"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  editor.chain().focus().unsetColor().run();
                  setShowTextColor(false);
                }}
              >
                Reset color
              </button>
            </div>
          )}
        </div>

        {/* Background/highlight color picker */}
        <div className="relative">
          <button
            className={`px-1.5 py-0.5 rounded text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 ${showBgColor ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
            onClick={(e) => { e.preventDefault(); setShowBgColor(!showBgColor); setShowTextColor(false); }}
            onMouseDown={(e) => e.preventDefault()}
            title="Background color"
          >
            <span className="px-0.5" style={{ backgroundColor: editor.getAttributes('highlight').color || 'transparent' }}>bg</span>
          </button>
          {showBgColor && (
            <div className="absolute top-6 left-0 z-[200] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-lg p-1.5 grid grid-cols-5 gap-1 min-w-[100px]">
              {BG_COLORS.map((color) => (
                <button
                  key={color}
                  className="w-5 h-5 rounded border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color === 'transparent' ? '#fff' : color }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    if (color === 'transparent') {
                      editor.chain().focus().unsetHighlight().run();
                    } else {
                      editor.chain().focus().toggleHighlight({ color }).run();
                    }
                    setShowBgColor(false);
                  }}
                >
                  {color === 'transparent' && <span className="text-[8px] text-gray-400">x</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  );
}

function ToolBtn({ active, onClick, label, className = '', title = '' }: { active: boolean; onClick: () => void; label: string; className?: string; title?: string }) {
  return (
    <button
      className={`px-1.5 py-0.5 rounded text-xs ${className} ${
        active ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
      onClick={(e) => { e.preventDefault(); onClick(); }}
      onMouseDown={(e) => e.preventDefault()}
      title={title}
    >
      {label}
    </button>
  );
}
