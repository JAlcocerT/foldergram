export function slugifyProfileName(name: string): string {
  const normalized = name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'profile';
}

export function resolveUniqueSlug(name: string, existing: Set<string>): string {
  const base = slugifyProfileName(name);
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
