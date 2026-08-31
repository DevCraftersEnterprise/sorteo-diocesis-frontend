import { describe, expect, it, vi } from 'vitest';
import { request } from './httpClient';
import {
  createParticipant,
  getUploadSignature,
  validateWallet,
} from './participants';

vi.mock('./httpClient', () => ({
  request: vi.fn(),
}));

const requestMock = vi.mocked(request);

describe('getUploadSignature', () => {
  it('hace POST a /sign-upload sin body', async () => {
    const signature = {
      cloudName: 'demo',
      apiKey: 'key',
      timestamp: 123,
      signature: 'sig',
      folder: 'ine-photos',
      type: 'authenticated' as const,
    };
    requestMock.mockResolvedValue(signature);

    const result = await getUploadSignature();

    expect(request).toHaveBeenCalledWith('/sign-upload', { method: 'POST' });
    expect(result).toBe(signature);
  });
});

describe('validateWallet', () => {
  it('hace GET a /wallet/validate con el wallet como query param', async () => {
    requestMock.mockResolvedValue({ ok: true, wallet: '007' });

    const result = await validateWallet('007');

    expect(request).toHaveBeenCalledWith('/wallet/validate', {
      query: { wallet: '007' },
    });
    expect(result).toEqual({ ok: true, wallet: '007' });
  });
});

describe('createParticipant', () => {
  it('hace POST a /participants con el body', async () => {
    const input = {
      name: 'Juan Pérez',
      walletNumber: '007',
      phone: '6441234567',
      photoPublicId: 'ine-photos/abc',
      photoVersion: '123',
    };
    requestMock.mockResolvedValue({ id: 'uuid-1', createdAt: '2026-01-01' });

    const result = await createParticipant(input);

    expect(request).toHaveBeenCalledWith('/participants', {
      method: 'POST',
      body: input,
    });
    expect(result).toEqual({ id: 'uuid-1', createdAt: '2026-01-01' });
  });
});
