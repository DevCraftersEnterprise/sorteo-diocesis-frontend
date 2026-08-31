import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UploadSignature } from '../api/participants';
import { CloudinaryUploadError, uploadPhoto } from './cloudinaryUpload';

const signature: UploadSignature = {
  cloudName: 'demo-cloud',
  apiKey: 'demo-key',
  timestamp: 1700000000,
  signature: 'fake-signature',
  folder: 'ine-photos',
  type: 'authenticated',
};

function fakeFile(): File {
  return new File(['fake-bytes'], 'ine.jpg', { type: 'image/jpeg' });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('uploadPhoto', () => {
  it('postea a la URL de Cloudinary del cloudName correcto', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ public_id: 'ine-photos/abc', version: 123 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await uploadPhoto(signature, fakeFile());

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.cloudinary.com/v1_1/demo-cloud/image/upload');
  });

  it('manda un FormData con file, api_key, timestamp, signature, folder y type', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ public_id: 'ine-photos/abc', version: 123 }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const file = fakeFile();

    await uploadPhoto(signature, file);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = init.body as FormData;
    expect(body.get('file')).toBe(file);
    expect(body.get('api_key')).toBe('demo-key');
    expect(body.get('timestamp')).toBe('1700000000');
    expect(body.get('signature')).toBe('fake-signature');
    expect(body.get('folder')).toBe('ine-photos');
    expect(body.get('type')).toBe('authenticated');
  });

  it('devuelve publicId/version mapeados de public_id/version', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ public_id: 'ine-photos/xyz', version: 1700000001 }),
        ),
    );

    const result = await uploadPhoto(signature, fakeFile());

    expect(result).toEqual({
      publicId: 'ine-photos/xyz',
      version: '1700000001',
    });
  });

  it('lanza CloudinaryUploadError si Cloudinary responde error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('bad request', { status: 400 })),
    );

    await expect(uploadPhoto(signature, fakeFile())).rejects.toBeInstanceOf(
      CloudinaryUploadError,
    );
  });
});
