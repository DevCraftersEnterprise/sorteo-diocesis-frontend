import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request } from './httpClient';
import { exportZip, fetchUnpaid, markAsPaid, purgeAll } from './admin';

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

describe('fetchUnpaid', () => {
  it('hace GET a /admin/unpaid con Authorization y mapea wallet_number/created_at a camelCase', async () => {
    requestMock.mockResolvedValue([
      {
        id: 'uuid-1',
        name: 'Juan',
        wallet_number: '007',
        created_at: '2026-01-01',
      },
    ]);

    const result = await fetchUnpaid(
      { Authorization: 'Bearer token-abc' },
      'Juan',
    );

    expect(request).toHaveBeenCalledWith('/admin/unpaid', {
      headers: { Authorization: 'Bearer token-abc' },
      query: { q: 'Juan' },
    });
    expect(result).toEqual([
      {
        id: 'uuid-1',
        name: 'Juan',
        walletNumber: '007',
        createdAt: '2026-01-01',
      },
    ]);
  });

  it('manda q como undefined si no hay query (sin parámetro en la URL)', async () => {
    requestMock.mockResolvedValue([]);

    await fetchUnpaid({ Authorization: 'Bearer token-abc' });

    expect(request).toHaveBeenCalledWith('/admin/unpaid', {
      headers: { Authorization: 'Bearer token-abc' },
      query: { q: undefined },
    });
  });
});

describe('markAsPaid', () => {
  it('hace PUT a /admin/mark-paid con Authorization y solo walletNumber en el body', async () => {
    requestMock.mockResolvedValue({ ok: true });

    const result = await markAsPaid(
      { Authorization: 'Bearer token-abc' },
      '007',
    );

    expect(request).toHaveBeenCalledWith('/admin/mark-paid', {
      method: 'PUT',
      headers: { Authorization: 'Bearer token-abc' },
      body: { walletNumber: '007' },
    });
    expect(result).toEqual({ ok: true });
  });
});
