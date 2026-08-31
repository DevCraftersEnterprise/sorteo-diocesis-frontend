import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { ApiError } from '../api/httpClient';
import UnpaidView from './UnpaidView.vue';

const isLoggedIn = ref(false);
const authHeadersMock = vi.fn();
const fetchUnpaidMock = vi.fn();
const markAsPaidMock = vi.fn();

vi.mock('../composables/useAdminSession', () => ({
  useAdminSession: () => ({
    isLoggedIn,
    authHeaders: authHeadersMock,
  }),
}));

vi.mock('../api/admin', () => ({
  fetchUnpaid: (...args: unknown[]) => fetchUnpaidMock(...args),
  markAsPaid: (...args: unknown[]) => markAsPaidMock(...args),
}));

function mountUnpaidView() {
  return mount(UnpaidView, {
    global: { stubs: { RouterLink: true } },
  });
}

describe('UnpaidView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLoggedIn.value = false;
  });

  it('muestra mensaje para iniciar sesión si no hay admin logueado', () => {
    const wrapper = mountUnpaidView();

    expect(wrapper.text()).toContain('Inicia sesión como admin');
    expect(fetchUnpaidMock).not.toHaveBeenCalled();
  });

  describe('con sesión activa', () => {
    beforeEach(() => {
      isLoggedIn.value = true;
      authHeadersMock.mockResolvedValue({ Authorization: 'Bearer token' });
    });

    it('al montar pide la lista con query vacío y la muestra', async () => {
      fetchUnpaidMock.mockResolvedValue([
        {
          id: 'uuid-1',
          name: 'Juan',
          walletNumber: '007',
          createdAt: '2026-01-01',
        },
      ]);

      const wrapper = mountUnpaidView();
      await vi.waitFor(() => {
        expect(fetchUnpaidMock).toHaveBeenCalled();
      });

      expect(fetchUnpaidMock).toHaveBeenCalledWith(
        { Authorization: 'Bearer token' },
        '',
      );
      expect(wrapper.text()).toContain('Juan');
      expect(wrapper.text()).toContain('007');
    });

    it('muestra el estado vacío cuando no hay carteras pendientes', async () => {
      fetchUnpaidMock.mockResolvedValue([]);

      const wrapper = mountUnpaidView();
      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('No hay carteras pendientes');
      });
    });

    it('muestra el mensaje del ApiError si falla la carga', async () => {
      fetchUnpaidMock.mockRejectedValue(
        new ApiError({
          statusCode: 403,
          error: 'forbidden',
          message: 'No tienes permisos de administrador',
        }),
      );

      const wrapper = mountUnpaidView();
      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('No tienes permisos');
      });
    });

    it('busca con debounce al escribir en el buscador', async () => {
      fetchUnpaidMock.mockResolvedValue([]);
      const wrapper = mountUnpaidView();
      await vi.waitFor(() => {
        expect(fetchUnpaidMock).toHaveBeenCalledTimes(1);
      });

      vi.useFakeTimers();
      try {
        await wrapper.find('input[type="search"]').setValue('Juan');
        expect(fetchUnpaidMock).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(350);

        expect(fetchUnpaidMock).toHaveBeenCalledTimes(2);
        expect(fetchUnpaidMock).toHaveBeenLastCalledWith(
          { Authorization: 'Bearer token' },
          'Juan',
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('el botón de refrescar vuelve a pedir la lista', async () => {
      fetchUnpaidMock.mockResolvedValue([]);
      const wrapper = mountUnpaidView();
      await vi.waitFor(() => {
        expect(fetchUnpaidMock).toHaveBeenCalledTimes(1);
      });

      await wrapper.find('[data-testid="refresh-button"]').trigger('click');
      await vi.waitFor(() => {
        expect(fetchUnpaidMock).toHaveBeenCalledTimes(2);
      });
    });

    it('no marca pagado si se cancela la confirmación', async () => {
      vi.stubGlobal(
        'confirm',
        vi.fn(() => false),
      );
      fetchUnpaidMock.mockResolvedValue([
        {
          id: 'uuid-1',
          name: 'Juan',
          walletNumber: '007',
          createdAt: '2026-01-01',
        },
      ]);
      const wrapper = mountUnpaidView();
      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Juan');
      });

      await wrapper.find('[data-testid="mark-paid-button"]').trigger('click');

      expect(markAsPaidMock).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it('marca pagado y refresca la lista si se confirma', async () => {
      vi.stubGlobal(
        'confirm',
        vi.fn(() => true),
      );
      fetchUnpaidMock.mockResolvedValue([
        {
          id: 'uuid-1',
          name: 'Juan',
          walletNumber: '007',
          createdAt: '2026-01-01',
        },
      ]);
      markAsPaidMock.mockResolvedValue({ ok: true });
      const wrapper = mountUnpaidView();
      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Juan');
      });

      await wrapper.find('[data-testid="mark-paid-button"]').trigger('click');
      await vi.waitFor(() => {
        expect(markAsPaidMock).toHaveBeenCalledWith(
          { Authorization: 'Bearer token' },
          '007',
        );
      });

      expect(fetchUnpaidMock).toHaveBeenCalledTimes(2);
      vi.unstubAllGlobals();
    });
  });
});
