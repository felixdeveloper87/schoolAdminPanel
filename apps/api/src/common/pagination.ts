export interface PageParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function parsePageParams(pageRaw?: string, pageSizeRaw?: string, defaultPageSize = 20): PageParams {
  const page = Math.max(1, Number.parseInt(pageRaw ?? '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(pageSizeRaw ?? String(defaultPageSize), 10) || defaultPageSize));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function paged<T>(items: T[], total: number, { page, pageSize }: PageParams) {
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
