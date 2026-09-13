import { create } from 'zustand';
import { Board, BoardItem, getBoards, getBoard, createBoard, updateBoard, deleteBoard, getBoardItems, createBoardItem, updateBoardItem, deleteBoardItem } from '../services/boardService';

interface BoardStore {
  boards: Board[];
  currentBoard: Board | null;
  isLoading: boolean;
  error: string | null;
  fetchBoards: (workspaceId: string) => Promise<void>;
  fetchBoard: (workspaceId: string, boardId: string) => Promise<void>;
  addBoard: (workspaceId: string, board: Partial<Board>) => Promise<void>;
  updateBoard: (workspaceId: string, boardId: string, board: Partial<Board>) => Promise<void>;
  removeBoard: (workspaceId: string, boardId: string) => Promise<void>;
  fetchBoardItems: (workspaceId: string, boardId: string) => Promise<void>;
  addBoardItem: (workspaceId: string, boardId: string, item: Partial<BoardItem>) => Promise<void>;
  updateBoardItem: (workspaceId: string, boardId: string, itemId: string, item: Partial<BoardItem>) => Promise<void>;
  removeBoardItem: (workspaceId: string, boardId: string, itemId: string) => Promise<void>;
  clearError: () => void;
}

export const useBoardStore = create<BoardStore>((set, get) => ({
  boards: [],
  currentBoard: null,
  isLoading: false,
  error: null,
  fetchBoards: async (workspaceId) => {
    set({ isLoading: true, error: null });
    try {
      const boards = await getBoards(workspaceId);
      set({ boards });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch boards' });
    } finally {
      set({ isLoading: false });
    }
  },
  fetchBoard: async (workspaceId, boardId) => {
    set({ isLoading: true, error: null });
    try {
      const board = await getBoard(workspaceId, boardId);
      set({ currentBoard: board });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch board' });
    } finally {
      set({ isLoading: false });
    }
  },
  addBoard: async (workspaceId, board) => {
    try {
      const newBoard = await createBoard(workspaceId, board);
      set((state) => ({ boards: [...state.boards, newBoard] }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to create board' });
    }
  },
  updateBoard: async (workspaceId, boardId, board) => {
    try {
      const updatedBoard = await updateBoard(workspaceId, boardId, board);
      set((state) => ({
        boards: state.boards.map((b) => (b.board_id === boardId ? updatedBoard : b)),
        currentBoard: state.currentBoard?.board_id === boardId ? updatedBoard : state.currentBoard,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to update board' });
    }
  },
  removeBoard: async (workspaceId, boardId) => {
    try {
      await deleteBoard(workspaceId, boardId);
      set((state) => ({
        boards: state.boards.filter((b) => b.board_id !== boardId),
        currentBoard: state.currentBoard?.board_id === boardId ? null : state.currentBoard,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete board' });
    }
  },
  fetchBoardItems: async (workspaceId, boardId) => {
    set({ isLoading: true, error: null });
    try {
      const items = await getBoardItems(workspaceId, boardId);
      set((state) => ({
        currentBoard: state.currentBoard ? { ...state.currentBoard, items } : null,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch board items' });
    } finally {
      set({ isLoading: false });
    }
  },
  addBoardItem: async (workspaceId, boardId, item) => {
    try {
      const newItem = await createBoardItem(workspaceId, boardId, item);
      set((state) => ({
        currentBoard: state.currentBoard
          ? { ...state.currentBoard, items: [...(state.currentBoard.items || []), newItem] }
          : null,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to create board item' });
    }
  },
  updateBoardItem: async (workspaceId, boardId, itemId, item) => {
    try {
      const updatedItem = await updateBoardItem(workspaceId, boardId, itemId, item);
      set((state) => ({
        currentBoard: state.currentBoard
          ? {
              ...state.currentBoard,
              items: state.currentBoard.items?.map((i) => (i.item_id === itemId ? updatedItem : i)),
            }
          : null,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to update board item' });
    }
  },
  removeBoardItem: async (workspaceId, boardId, itemId) => {
    try {
      await deleteBoardItem(workspaceId, boardId, itemId);
      set((state) => ({
        currentBoard: state.currentBoard
          ? {
              ...state.currentBoard,
              items: state.currentBoard.items?.filter((i) => i.item_id !== itemId),
            }
          : null,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete board item' });
    }
  },
  clearError: () => set({ error: null }),
})); 