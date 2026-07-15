import { create } from 'zustand';
import { api } from '../api/client';
import type { Board, Note, Column, Group } from '../types';

interface BoardStore {
  boards: Board[];
  activeBoard: Board | null;
  notes: Note[];
  columns: Column[];
  groups: Group[];
  loading: boolean;
  fitAllRequest: number;

  fetchBoards: () => Promise<void>;
  createBoard: (name: string) => Promise<void>;
  selectBoard: (id: string) => Promise<void>;
  updateBoard: (id: string, data: Partial<Board>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;

  fetchBoardData: (boardId: string) => Promise<void>;
  requestFitAll: () => void;

  createNote: (data: Partial<Note>) => Promise<Note>;
  updateNote: (id: string, data: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  batchUpdatePositions: (updates: any[]) => Promise<void>;
  copyNote: (id: string, targetBoardId: string) => Promise<void>;
  moveNote: (id: string, targetBoardId: string) => Promise<void>;

  createColumn: (data: Partial<Column>) => Promise<void>;
  updateColumn: (id: string, data: Partial<Column>) => Promise<void>;
  previewColumnPositions: (updates: Array<Pick<Column, 'id' | 'x' | 'y'>>) => void;
  saveColumnPositions: (updates: Array<Pick<Column, 'id' | 'x' | 'y'>>) => Promise<void>;
  setColumnLinkGroups: (updates: Array<Pick<Column, 'id' | 'link_group_id'>>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;

  createGroup: (data: Partial<Group>) => Promise<void>;
  updateGroup: (id: string, data: Partial<Group>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
}

export const useBoardStore = create<BoardStore>((set, get) => ({
  boards: [],
  activeBoard: null,
  notes: [],
  columns: [],
  groups: [],
  loading: false,
  fitAllRequest: 0,

  fetchBoards: async () => {
    const boards = await api.boards.list();
    set({ boards });
  },

  createBoard: async (name: string) => {
    const board = await api.boards.create(name);
    set((s) => ({ boards: [board, ...s.boards] }));
    await get().selectBoard(board.id);
  },

  selectBoard: async (id: string) => {
    set({ loading: true });
    const board = await api.boards.get(id);
    set({ activeBoard: board });
    await get().fetchBoardData(id);
    set({ loading: false });
  },

  updateBoard: async (id: string, data: Partial<Board>) => {
    const board = await api.boards.update(id, data);
    set((s) => ({
      activeBoard: s.activeBoard?.id === id ? board : s.activeBoard,
      boards: s.boards.map((b) => (b.id === id ? board : b)),
    }));
  },

  deleteBoard: async (id: string) => {
    await api.boards.delete(id);
    const boards = get().boards.filter((b) => b.id !== id);
    set({ boards });
    if (get().activeBoard?.id === id) {
      if (boards.length > 0) {
        await get().selectBoard(boards[0].id);
      } else {
        set({ activeBoard: null, notes: [], columns: [], groups: [] });
      }
    }
  },

  fetchBoardData: async (boardId: string) => {
    const [notes, columns, groups] = await Promise.all([
      api.notes.list(boardId),
      api.columns.list(boardId),
      api.groups.list(boardId),
    ]);
    set({ notes, columns, groups });
  },

  requestFitAll: () => {
    set((s) => ({ fitAllRequest: s.fitAllRequest + 1 }));
  },

  createNote: async (data: Partial<Note>) => {
    const note = await api.notes.create({ ...data, board_id: get().activeBoard?.id });
    set((s) => ({ notes: [...s.notes, note] }));
    return note;
  },

  updateNote: async (id: string, data: Partial<Note>) => {
    const note = await api.notes.update(id, data);
    set((s) => ({ notes: s.notes.map((n) => (n.id === id ? note : n)) }));
  },

  deleteNote: async (id: string) => {
    await api.notes.delete(id);
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
  },

  batchUpdatePositions: async (updates: any[]) => {
    await api.notes.batchPositions(updates);
  },

  copyNote: async (id: string, targetBoardId: string) => {
    await api.notes.copy(id, targetBoardId);
  },

  moveNote: async (id: string, targetBoardId: string) => {
    await api.notes.move(id, targetBoardId);
    // Remove from current board's notes
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
  },

  createColumn: async (data: Partial<Column>) => {
    const column = await api.columns.create({ ...data, board_id: get().activeBoard?.id });
    set((s) => ({ columns: [...s.columns, column] }));
  },

  updateColumn: async (id: string, data: Partial<Column>) => {
    // Apply the requested values immediately so an older response cannot make
    // controls such as the grid selector visibly jump back to stale state.
    set((s) => ({
      columns: s.columns.map((column) =>
        column.id === id ? { ...column, ...data } : column
      ),
    }));

    const column = await api.columns.update(id, data);
    set((s) => ({
      columns: s.columns.map((current) =>
        current.id === id
          ? { ...current, ...data, updated_at: column.updated_at ?? current.updated_at }
          : current
      ),
    }));
  },

  previewColumnPositions: (updates) => {
    const positions = new Map(updates.map((update) => [update.id, update]));
    set((s) => ({
      columns: s.columns.map((column) => {
        const position = positions.get(column.id);
        return position ? { ...column, x: position.x, y: position.y } : column;
      }),
    }));
  },

  saveColumnPositions: async (updates) => {
    get().previewColumnPositions(updates);
    await api.columns.batchPositions(updates);
  },

  setColumnLinkGroups: async (updates) => {
    const linkGroups = new Map(updates.map((update) => [update.id, update.link_group_id]));
    set((s) => ({
      columns: s.columns.map((column) =>
        linkGroups.has(column.id)
          ? { ...column, link_group_id: linkGroups.get(column.id) ?? null }
          : column
      ),
    }));
    await api.columns.batchLinks(updates);
  },

  deleteColumn: async (id: string) => {
    await api.columns.delete(id);
    set((s) => ({
      columns: s.columns.filter((c) => c.id !== id),
      notes: s.notes.map((n) => (n.column_id === id ? { ...n, column_id: null } : n)),
    }));
  },

  createGroup: async (data: Partial<Group>) => {
    const group = await api.groups.create({ ...data, board_id: get().activeBoard?.id });
    set((s) => ({ groups: [...s.groups, group] }));
  },

  updateGroup: async (id: string, data: Partial<Group>) => {
    const group = await api.groups.update(id, data);
    set((s) => ({ groups: s.groups.map((g) => (g.id === id ? group : g)) }));
  },

  deleteGroup: async (id: string) => {
    await api.groups.delete(id);
    set((s) => ({
      groups: s.groups.filter((g) => g.id !== id),
      notes: s.notes.map((n) => (n.group_id === id ? { ...n, group_id: null } : n)),
    }));
  },
}));
