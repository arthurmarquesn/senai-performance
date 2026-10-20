export const STUDENTS_PAGE_SIZE = 25;

export function getPagination(value: string | undefined, total: number, pageSize = STUDENTS_PAGE_SIZE) {
  const parsed = value && /^\d+$/.test(value) ? Number(value) : 1;
  const requested = Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requested, pages);
  return { page, pages, skip: (page - 1) * pageSize, take: pageSize };
}

export function studentsPageHref(page: number, filters: { q: string; ano: number | null; turma: string }) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.ano !== null) params.set("ano", String(filters.ano));
  if (filters.turma) params.set("turma", filters.turma);
  params.set("pagina", String(page));
  return `/alunos?${params}`;
}
