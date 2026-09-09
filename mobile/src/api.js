import { API_BASE_URL } from '../config';

export async function fetchBooks() {
  const res = await fetch(`${API_BASE_URL}/api/books`);
  if (!res.ok) throw new Error('Failed to load books');
  return res.json();
}

export function fileUrl(id) {
  return `${API_BASE_URL}/api/books/${id}/file`;
}
