import api from './api';

export interface BoardItem {
  item_id: string;
  board_id: string;
  title: string;
  description?: string;
  status?: string;
  assignee_id?: string;
  due_date?: string;
  properties?: Record<string, any>;
  order?: number;
}

export interface Board {
  board_id: string;
  workspace_id: string;
  name: string;
  key?: string;
  description?: string;
  properties?: Record<string, any>;
  views?: Record<string, any>[];
  items?: BoardItem[];
}

// Board rows really only have {board_id, workspace_id, name, key,
// description, properties, views} (board_dto.py) -- there's no
// is_template/is_public/items field on the backend. Boards previously
// used `title`, which the API silently ignored (falling back to whatever
// default the DB has), and is_template/is_public were never persisted
// anywhere.

export const getBoards = async (workspaceId: string): Promise<Board[]> => {
  const res = await api.get(`/api/v1/workspaces/${workspaceId}/boards`);
  return res.data;
};

export const getBoard = async (workspaceId: string, boardId: string): Promise<Board> => {
  const res = await api.get(`/api/v1/workspaces/${workspaceId}/boards/${boardId}`);
  return res.data;
};

export const createBoard = async (workspaceId: string, board: Partial<Board>): Promise<Board> => {
  const res = await api.post(`/api/v1/workspaces/${workspaceId}/boards`, {
    name: board.name,
    description: board.description,
    properties: board.properties,
  });
  return res.data;
};

export const updateBoard = async (workspaceId: string, boardId: string, board: Partial<Board>): Promise<Board> => {
  const res = await api.put(`/api/v1/workspaces/${workspaceId}/boards/${boardId}`, {
    name: board.name,
    description: board.description,
    properties: board.properties,
  });
  return res.data;
};

export const deleteBoard = async (workspaceId: string, boardId: string): Promise<void> => {
  await api.delete(`/api/v1/workspaces/${workspaceId}/boards/${boardId}`);
};

// There's no /boards/{id}/items sub-resource on the backend at all --
// board_controller.py only has CRUD for the board itself. "Board items"
// are just Task rows filtered/tagged by board_id (the same
// Tasks-as-generic-entity pattern used for Notes and Timeblocks
// elsewhere in this app). These four functions keep the BoardItem shape
// and function signatures the rest of the app (boardStore.ts, the board
// screens) already calls, translating to/from the real Task fields
// underneath so nothing above this file needs to change.

interface TaskDto {
  task_id: string;
  board_id?: string;
  title: string;
  description?: string;
  status?: string;
  assignee_id?: string;
  due_on?: string;
  order?: number;
  meta_data?: Record<string, any>;
}

const taskToBoardItem = (task: TaskDto): BoardItem => ({
  item_id: task.task_id,
  board_id: task.board_id ?? '',
  title: task.title,
  description: task.description,
  status: task.status,
  assignee_id: task.assignee_id,
  due_date: task.due_on,
  order: task.order,
  properties: task.meta_data,
});

const boardItemToTaskPayload = (item: Partial<BoardItem>) => ({
  ...(item.title !== undefined && { title: item.title }),
  ...(item.description !== undefined && { description: item.description }),
  ...(item.status !== undefined && { status: item.status }),
  ...(item.assignee_id !== undefined && { assignee_id: item.assignee_id }),
  ...(item.due_date !== undefined && { due_on: item.due_date }),
  ...(item.order !== undefined && { order: item.order }),
  ...(item.properties !== undefined && { meta_data: item.properties }),
});

export const getBoardItems = async (workspaceId: string, boardId: string): Promise<BoardItem[]> => {
  const res = await api.get(`/api/v1/workspaces/${workspaceId}/tasks`, {
    params: { board_id: boardId },
  });
  const tasks: TaskDto[] = res.data || [];
  return tasks.map(taskToBoardItem);
};

export const createBoardItem = async (workspaceId: string, boardId: string, item: Partial<BoardItem>): Promise<BoardItem> => {
  const res = await api.post(`/api/v1/workspaces/${workspaceId}/tasks`, {
    ...boardItemToTaskPayload(item),
    board_id: boardId,
    workspace_id: workspaceId,
    task_type: 'TASK',
  });
  return taskToBoardItem(res.data);
};

export const updateBoardItem = async (workspaceId: string, boardId: string, itemId: string, item: Partial<BoardItem>): Promise<BoardItem> => {
  const res = await api.put(`/api/v1/workspaces/${workspaceId}/tasks/${itemId}`, boardItemToTaskPayload(item));
  return taskToBoardItem(res.data);
};

export const deleteBoardItem = async (workspaceId: string, boardId: string, itemId: string): Promise<void> => {
  await api.delete(`/api/v1/workspaces/${workspaceId}/tasks/${itemId}`);
};
