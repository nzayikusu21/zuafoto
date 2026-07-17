export function slugify(str) {
  return (
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'evenement'
  );
}

/** Finds a unique slug by appending -2, -3, etc. if the base slug is taken. */
export async function uniqueSlug(env, baseName) {
  const base = slugify(baseName);
  let candidate = base;
  let n = 1;
  while (await env.EVENTS_KV.get(`event:${candidate}`)) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}
