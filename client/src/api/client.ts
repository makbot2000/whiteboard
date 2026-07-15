const API_BASE = '/api';

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  return res.json();
}

// Boards
export const api = {
  boards: {
    list: () => request('/boards'),
    get: (id: string) => request(`/boards/${id}`),
    create: (name: string) => request('/boards', { method: 'POST', body: JSON.stringify({ name }) }),
    update: (id: string, data: any) => request(`/boards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/boards/${id}`, { method: 'DELETE' }),
  },
  notes: {
    list: (boardId: string) => request(`/notes?board_id=${boardId}`),
    create: (data: any) => request('/notes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/notes/${id}`, { method: 'DELETE' }),
    batchPositions: (updates: any[]) => request('/notes/batch/positions', { method: 'PUT', body: JSON.stringify({ updates }) }),
    copy: (id: string, targetBoardId: string) => request(`/notes/${id}/copy`, { method: 'POST', body: JSON.stringify({ target_board_id: targetBoardId }) }),
    move: (id: string, targetBoardId: string) => request(`/notes/${id}/move`, { method: 'POST', body: JSON.stringify({ target_board_id: targetBoardId }) }),
  },
  columns: {
    list: (boardId: string) => request(`/columns?board_id=${boardId}`),
    create: (data: any) => request('/columns', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/columns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/columns/${id}`, { method: 'DELETE' }),
  },
  groups: {
    list: (boardId: string) => request(`/groups?board_id=${boardId}`),
    create: (data: any) => request('/groups', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/groups/${id}`, { method: 'DELETE' }),
  },
};
