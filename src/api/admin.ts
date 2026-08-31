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
