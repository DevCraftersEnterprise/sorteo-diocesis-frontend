import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { FirebaseError } from 'firebase/app';
import { ApiError } from '../api/httpClient';
import AdminView from './AdminView.vue';

const isLoggedIn = ref(false);
const loginMock = vi.fn();
const logoutMock = vi.fn();
const authHeadersMock = vi.fn();
const exportZipMock = vi.fn();
const purgeAllMock = vi.fn();
const downloadBlobMock = vi.fn();

vi.mock('../composables/useAdminSession', () => ({
  useAdminSession: () => ({
    isLoggedIn,
    login: loginMock,
    logout: logoutMock,
    authHeaders: authHeadersMock,
  }),
}));

vi.mock('../api/admin', () => ({
  exportZip: (...args: unknown[]) => exportZipMock(...args),
  purgeAll: (...args: unknown[]) => purgeAllMock(...args),
}));

vi.mock('../utils/downloadBlob', () => ({
  downloadBlob: (...args: unknown[]) => downloadBlobMock(...args),
}));

function mountAdminView() {
  return mount(AdminView, {
    global: { stubs: { RouterLink: true } },
  });
}

describe('AdminView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLoggedIn.value = false;
  });

  describe('sin sesión', () => {
    it('muestra el formulario de login', () => {
      const wrapper = mountAdminView();

      expect(wrapper.find('input[type="email"]').exists()).toBe(true);
      expect(wrapper.find('input[type="password"]').exists()).toBe(true);
    });

    it('pide completar email y contraseña', async () => {
      const wrapper = mountAdminView();

      await wrapper.find('form').trigger('submit');

      expect(wrapper.text()).toContain('Completa el email y la contraseña');
      expect(loginMock).not.toHaveBeenCalled();
    });

    it('llama a session.login con el email y password', async () => {
      loginMock.mockResolvedValue(undefined);
      const wrapper = mountAdminView();

      await wrapper.find('input[type="email"]').setValue('admin@example.com');
      await wrapper.find('input[type="password"]').setValue('secret');
      await wrapper.find('form').trigger('submit');
      await vi.waitFor(() => {
        expect(loginMock).toHaveBeenCalled();
      });

      expect(loginMock).toHaveBeenCalledWith('admin@example.com', 'secret');
      expect(wrapper.text()).toContain('Admin conectado');
    });

    it('muestra el código de FirebaseError si el login falla', async () => {
      loginMock.mockRejectedValue(
        new FirebaseError('auth/wrong-password', 'Wrong password'),
      );
      const wrapper = mountAdminView();

      await wrapper.find('input[type="email"]').setValue('admin@example.com');
      await wrapper.find('input[type="password"]').setValue('bad');
      await wrapper.find('form').trigger('submit');
      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('auth/wrong-password');
      });
    });
  });

  describe('con sesión activa', () => {
    beforeEach(() => {
      isLoggedIn.value = true;
      authHeadersMock.mockResolvedValue({ Authorization: 'Bearer token' });
    });

    it('muestra las acciones de admin, no el login', () => {
      const wrapper = mountAdminView();

      expect(wrapper.find('input[type="email"]').exists()).toBe(false);
      expect(wrapper.text()).toContain('Descargar ZIP');
      expect(wrapper.text()).toContain('Borrar base de datos');
    });

    it('descarga el ZIP con los headers de sesión', async () => {
      const fakeBlob = new Blob(['zip']);
      exportZipMock.mockResolvedValue(fakeBlob);
      const wrapper = mountAdminView();

      await wrapper
        .find('[data-testid="download-zip-button"]')
        .trigger('click');
      await vi.waitFor(() => {
        expect(downloadBlobMock).toHaveBeenCalled();
      });

      expect(exportZipMock).toHaveBeenCalledWith({
        Authorization: 'Bearer token',
      });
      expect(downloadBlobMock).toHaveBeenCalledWith(
        fakeBlob,
        expect.stringMatching(/^sorteo_export_\d+\.zip$/),
      );
    });

    it('no purga si se cancela la confirmación', async () => {
      vi.stubGlobal(
        'confirm',
        vi.fn(() => false),
      );
      const wrapper = mountAdminView();

      await wrapper.find('[data-testid="purge-button"]').trigger('click');

      expect(purgeAllMock).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it('purga y muestra el resumen si se confirma', async () => {
      vi.stubGlobal(
        'confirm',
        vi.fn(() => true),
      );
      purgeAllMock.mockResolvedValue({
        ok: true,
        deletedParticipants: 3,
        deletedPhotos: 3,
        failedPhotoDeletions: 0,
      });
      const wrapper = mountAdminView();

      await wrapper.find('[data-testid="purge-button"]').trigger('click');
      await vi.waitFor(() => {
        expect(purgeAllMock).toHaveBeenCalled();
      });

      expect(purgeAllMock).toHaveBeenCalledWith({
        Authorization: 'Bearer token',
      });
      expect(wrapper.text()).toContain('Registros: 3');
      expect(wrapper.text()).toContain('Fotos: 3');
      vi.unstubAllGlobals();
    });

    it('muestra el mensaje del ApiError si la purga falla', async () => {
      vi.stubGlobal(
        'confirm',
        vi.fn(() => true),
      );
      purgeAllMock.mockRejectedValue(
        new ApiError({
          statusCode: 403,
          error: 'forbidden',
          message: 'No tienes permisos de administrador',
        }),
      );
      const wrapper = mountAdminView();

      await wrapper.find('[data-testid="purge-button"]').trigger('click');
      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('No tienes permisos');
      });
      vi.unstubAllGlobals();
    });

    it('logout llama a session.logout', async () => {
      logoutMock.mockResolvedValue(undefined);
      const wrapper = mountAdminView();

      await wrapper.find('[data-testid="logout-button"]').trigger('click');
      await vi.waitFor(() => {
        expect(logoutMock).toHaveBeenCalled();
      });

      expect(wrapper.text()).toContain('Sesión cerrada');
    });
  });
});
