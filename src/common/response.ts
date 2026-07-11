export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PageMeta;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export const success = <T>(data: T, meta?: PageMeta): ApiSuccess<T> => ({
  success: true,
  data,
  ...(meta ? { meta } : {}),
});

export const failure = (code: string, message: string, details?: unknown): ApiFailure => ({
  success: false,
  error: { code, message, ...(details !== undefined ? { details } : {}) },
});
