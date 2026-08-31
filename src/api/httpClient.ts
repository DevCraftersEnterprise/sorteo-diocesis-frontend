// Capa de transporte HTTP: sabe hablar con el backend NestJS (URL
// base, JSON, errores) pero no conoce ningún endpoint de negocio.
// Los módulos por feature (src/api/participants.ts, src/api/admin.ts,
// etc.) se apoyan en request() para lo suyo.

// Forma exacta de HttpExceptionFilter en el backend
// (src/common/filters/http-exception.filter.ts).
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path?: string;
  timestamp?: string;
  requestId?: string;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly errorCode: string;
  readonly requestId?: string;

  constructor(body: ApiErrorBody) {
    super(Array.isArray(body.message) ? body.message.join(', ') : body.message);
    this.name = 'ApiError';
    this.statusCode = body.statusCode;
    this.errorCode = body.error;
    this.requestId = body.requestId;
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string | undefined>;
}

// Exportado: lo reutilizan los módulos que necesitan fetch crudo en
// vez de request() (ej. admin.ts para descargar el ZIP binario).
export function buildUrl(
  path: string,
  query?: Record<string, string | undefined>,
): string {
  // Se lee en cada llamada (no se cachea en un const de módulo) para
  // que quede testeable con vi.stubEnv sin tener que reimportar el
  // módulo entre tests.
  let url = `${import.meta.env.VITE_API_URL}${path}`;

  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) params.set(key, value);
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  return url;
}

// Exportado por la misma razón que buildUrl: los fetch crudos
// también necesitan traducir una respuesta de error al mismo
// ApiError que usa request().
export async function parseApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as Partial<ApiErrorBody>;
    return new ApiError({
      statusCode: body.statusCode ?? response.status,
      error: body.error ?? 'unknown_error',
      message: body.message ?? `Error ${response.status}`,
      path: body.path,
      timestamp: body.timestamp,
      requestId: body.requestId,
    });
  } catch {
    // El body no era JSON (ej. error de red/proxy antes de llegar a Nest).
    return new ApiError({
      statusCode: response.status,
      error: 'unknown_error',
      message: `Error ${response.status}`,
    });
  }
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(path, options.query);

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body !== undefined
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : null,
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
