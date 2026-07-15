export interface Board {
  id: string;
  name: string;
  zoom: number;
  pan_x: number;
  pan_y: number;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  board_id: string;
  column_id: string | null;
  group_id: string | null;
  title: string;
  content_json: string;
  x: number;
  y: number;
  width: number;
  height: number;
  position_in_column: number | null;
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: string;
  board_id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  layout_mode: string;
  grid_columns: number;
  sort_by: string;
  sort_order: string;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  board_id: string;
  name: string;
  color: string;
  created_at: string;
}
