import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request } from './httpClient';
import { exportZip, purgeAll } from './admin';

vi.mock('./httpClient', async () => {
  const actual =
    await vi.importActual<typeof import('./httpClient')>('./httpClient');
  return {
    ...actual,
    request: vi.fn(),
  };
});

const requestMock = vi.mocked(request);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('purgeAll', () => {
  it('hace POST a /admin/purge con Authorization y X-Confirm-Purge: yes', async () => {
    const summary = {
      ok: true as const,
      deletedParticipants: 3,
      deletedPhotos: 3,
      failedPhotoDeletions: 0,
    };
    requestMock.mockResolvedValue(summary);

    const result = await purgeAll({ Authorization: 'Bearer token-abc' });

    expect(request).toHaveBeenCalledWith('/admin/purge', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token-abc',
        'X-Confirm-Purge': 'yes',
      },
    });
    expect(result).toBe(summary);
  });
});

describe('exportZip', () => {
  it('hace GET a /admin/export con Authorization y devuelve el blob', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000/api');
    // jsdom no soporta un Blob como body de Response (le falta
    // stream()) -- un string produce el mismo resultado vía .blob().
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('zip-bytes', {
        status: 200,
        headers: { 'Content-Type': 'application/zip' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await exportZip({ Authorization: 'Bearer token-abc' });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/admin/export',
      { headers: { Authorization: 'Bearer token-abc' } },
    );
    expect(await result.text()).toBe('zip-bytes');
  });

  it('lanza ApiError si el backend responde error', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000/api');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            statusCode: 403,
            error: 'forbidden',
            message: 'No tienes permisos de administrador',
          }),
          { status: 403 },
        ),
      ),
    );

    await expect(
      exportZip({ Authorization: 'Bearer token-abc' }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
