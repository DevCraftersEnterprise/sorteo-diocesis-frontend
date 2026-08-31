// Endpoints públicos (sin auth) del flujo de registro: firma de
// subida, disponibilidad de cartera y alta del participante.
// Contrato tomado de sorteo-diocesis-backend:
//   src/integrations/cloudinary/cloudinary.service.ts (UploadSignature)
//   src/modules/wallet/wallet.service.ts (WalletAvailability)
//   src/modules/participants/dto/create-participant.dto.ts

import { request } from './httpClient';

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  type: 'authenticated';
}

export function getUploadSignature(): Promise<UploadSignature> {
  return request<UploadSignature>('/sign-upload', { method: 'POST' });
}

export interface WalletAvailability {
  ok: true;
  wallet: string;
}

export function validateWallet(wallet: string): Promise<WalletAvailability> {
  return request<WalletAvailability>('/wallet/validate', {
    query: { wallet },
  });
}

export interface CreateParticipantInput {
  name: string;
  walletNumber: string;
  phone: string;
  photoPublicId: string;
  photoVersion?: string;
}

export interface CreatedParticipant {
  id: string;
  createdAt: string;
}

export function createParticipant(
  input: CreateParticipantInput,
): Promise<CreatedParticipant> {
  return request<CreatedParticipant>('/participants', {
    method: 'POST',
    body: input,
  });
}
