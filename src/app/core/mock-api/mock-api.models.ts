export interface MockApiPage<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface MockApiPageQuery {
  page?: number;
  pageSize?: number;
}

export interface MockApiRequestOptions {
  delay?: number;
}
