export function slugifyFolderName(name: string): string {
  const normalized = name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'folder';
}

export function resolveUniqueSlug(name: string, existing: Set<string>): string {
  const base = slugifyFolderName(name);
  if (!existing.has(base)) {
    existing.add(base);
    return base;
  }

  let index = 2;
  while (existing.has(`${base}-${index}`)) {
    index += 1;
  }

  const slug = `${base}-${index}`;
  existing.add(slug);
  return slug;
}
