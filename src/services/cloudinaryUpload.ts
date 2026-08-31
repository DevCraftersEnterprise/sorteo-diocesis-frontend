// Sube la foto directo a Cloudinary desde el navegador -- el binario
// nunca pasa por nuestro backend, solo la firma (ver
// src/api/participants.ts -> getUploadSignature). Equivalente al
// uploadToCloudinary() de la app Flutter.

import type { UploadSignature } from '../api/participants';

export interface CloudinaryUploadResult {
  publicId: string;
  version: string;
}

export class CloudinaryUploadError extends Error {
  constructor(message = 'No se pudo subir la foto a Cloudinary') {
    super(message);
    this.name = 'CloudinaryUploadError';
  }
}

interface CloudinaryUploadResponse {
  public_id: string;
  version: number | string;
}

export async function uploadPhoto(
  signature: UploadSignature,
  file: File,
): Promise<CloudinaryUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', signature.apiKey);
  formData.append('timestamp', String(signature.timestamp));
  formData.append('signature', signature.signature);
  formData.append('folder', signature.folder);
  formData.append('type', signature.type);

  const url = `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`;
  const response = await fetch(url, { method: 'POST', body: formData });

  if (!response.ok) {
    throw new CloudinaryUploadError();
  }

  const data = (await response.json()) as CloudinaryUploadResponse;

  return {
    publicId: data.public_id,
    version: String(data.version),
  };
}
