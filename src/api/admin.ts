// Endpoints de administración: requieren el header Authorization con
// el ID token de Firebase (ver useAdminSession().authHeaders()).
// Contrato tomado de sorteo-diocesis-backend:
//   src/modules/admin/admin.controller.ts
//   src/modules/admin/admin.service.ts

import { buildUrl, parseApiError, request } from './httpClient';

export interface PurgeSummary {
  ok: true;
  deletedParticipants: number;
  deletedPhotos: number;
  failedPhotoDeletions: number;
}

export interface UnpaidParticipant {
  id: string;
  name: string;
  walletNumber: string;
  createdAt: string;
}

// El backend devuelve wallet_number en snake_case a propósito (era el
// contrato real del cliente Flutter) -- se mapea a camelCase acá para
// que el resto del frontend no tenga que pensar en eso.
interface UnpaidParticipantRow {
  id: string;
  name: string;
  wallet_number: string;
  created_at: string;
}

export async function fetchUnpaid(
  authHeaders: Record<string, string>,
  query = '',
): Promise<UnpaidParticipant[]> {
  const rows = await request<UnpaidParticipantRow[]>('/admin/unpaid', {
    headers: authHeaders,
    query: { q: query || undefined },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    walletNumber: row.wallet_number,
    createdAt: row.created_at,
  }));
}

// adminEmail ya no se manda: el backend lo deriva del token verificado
// y solo lo acepta por compatibilidad con el cliente Flutter (BUG-002).
export function markAsPaid(
  authHeaders: Record<string, string>,
  walletNumber: string,
): Promise<{ ok: true }> {
  return request<{ ok: true }>('/admin/mark-paid', {
    method: 'PUT',
    headers: authHeaders,
    body: { walletNumber },
  });
}

const CONFIRM_PURGE_HEADER = 'X-Confirm-Purge';
const CONFIRM_PURGE_VALUE = 'yes';

export function purgeAll(
  authHeaders: Record<string, string>,
): Promise<PurgeSummary> {
  return request<PurgeSummary>('/admin/purge', {
    method: 'POST',
    headers: {
      ...authHeaders,
      [CONFIRM_PURGE_HEADER]: CONFIRM_PURGE_VALUE,
    },
  });
}

// GET /admin/export devuelve el ZIP binario directo -- no pasa por
// request() (que siempre espera/parsea JSON).
export async function exportZip(
  authHeaders: Record<string, string>,
): Promise<Blob> {
  const response = await fetch(buildUrl('/admin/export'), {
    headers: authHeaders,
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return response.blob();
}
