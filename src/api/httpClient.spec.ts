import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request } from './httpClient';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fetchMock(response: Response): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
}

beforeEach(() => {
  // Fijo, sin importar lo que traiga el .env local o el CI — así el
  // test no depende de configuración externa.
  vi.stubEnv('VITE_API_URL', 'http://localhost:3000/api');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('request', () => {
  it('hace GET a VITE_API_URL + path y devuelve el JSON parseado', async () => {
    fetchMock(jsonResponse({ ok: true }));

    const result = await request<{ ok: boolean }>('/wallet/validate');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/wallet/validate',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result).toEqual({ ok: true });
  });

  it('serializa el body como JSON y manda Content-Type en POST', async () => {
    fetchMock(jsonResponse({ id: '1' }, 201));

    await request('/participants', {
      method: 'POST',
      body: { name: 'Juan' },
    });

    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: 'Juan' }));
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json',
    );
  });

  it('no manda Content-Type cuando no hay body (GET)', async () => {
    fetchMock(jsonResponse({}));

    await request('/admin/unpaid');

    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit];
    expect(
      (init.headers as Record<string, string> | undefined)?.['Content-Type'],
    ).toBeUndefined();
  });

  it('arma la query string, descartando valores undefined', async () => {
    fetchMock(jsonResponse([]));

    await request('/admin/unpaid', { query: { q: 'Juan', extra: undefined } });

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/admin/unpaid?q=Juan',
      expect.anything(),
    );
  });

  it('devuelve undefined en 204 sin intentar parsear el body', async () => {
    fetchMock(new Response(null, { status: 204 }));

    const result = await request('/admin/mark-paid', { method: 'PUT' });

    expect(result).toBeUndefined();
  });

  it('lanza ApiError con statusCode/errorCode/message/requestId del backend', async () => {
    fetchMock(
      jsonResponse(
        {
          statusCode: 404,
          error: 'participant_not_found',
          message: 'No existe ningún participante con la cartera 999',
          path: '/api/admin/mark-paid',
          timestamp: '2026-01-01T00:00:00.000Z',
          requestId: 'req-123',
        },
        404,
      ),
    );

    await expect(request('/admin/mark-paid')).rejects.toMatchObject({
      name: 'ApiError',
      statusCode: 404,
      errorCode: 'participant_not_found',
      message: 'No existe ningún participante con la cartera 999',
      requestId: 'req-123',
    });
  });

  it('une los mensajes de validación (array) con coma en el Error.message', async () => {
    fetchMock(
      jsonResponse(
        {
          statusCode: 400,
          error: 'bad_request',
          message: ['walletNumber es requerido', 'phone es requerido'],
        },
        400,
      ),
    );

    await expect(request('/participants', { method: 'POST' })).rejects.toThrow(
      'walletNumber es requerido, phone es requerido',
    );
  });

  it('cae a un ApiError genérico si el body de error no es JSON', async () => {
    fetchMock(new Response('<html>502 Bad Gateway</html>', { status: 502 }));

    await expect(request('/health')).rejects.toMatchObject({
      name: 'ApiError',
      statusCode: 502,
      errorCode: 'unknown_error',
    } satisfies Partial<ApiError>);
  });
});
