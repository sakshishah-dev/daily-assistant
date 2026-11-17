export type Status = 'todo' | 'doing' | 'done';
export type Kind = 'youtube' | 'instagram' | 'web' | 'note';

export interface Folder {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort: number;
  created_at: string;
}

export interface Item {
  id: string;
  folder_id: string;
  title: string;
  url: string | null;
  kind: Kind;
  thumb_url: string | null;
  preview_json: unknown | null;
  note: string | null;
  status: Status;
  due_date: string | null; // yyyy-mm-dd
  done_at: string | null;
  sort: number;
  created_at: string;
}

export interface Subtask {
  id: string;
  item_id: string;
  text: string;
  done: boolean;
  sort: number;
  created_at: string;
}

export const STATUSES: { value: Status; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'doing', label: 'Doing' },
  { value: 'done', label: 'Done' },
];

export const SUGGESTED_FOLDERS = [
  { name: 'Work', icon: 'briefcase' },
  { name: 'Gym', icon: 'dumbbell' },
  { name: 'Food', icon: 'utensils' },
  { name: 'Goals', icon: 'target' },
];

export interface PreviewResult {
  kind: Kind;
  url: string;
  title: string | null;
  thumbnailUrl: string | null;
  provider: string | null;
}
