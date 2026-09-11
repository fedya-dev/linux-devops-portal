export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('bg-BG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function readingTime(content: string): string {
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} мин`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
