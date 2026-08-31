import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ApiError } from '../api/httpClient';
import { CloudinaryUploadError } from '../services/cloudinaryUpload';
import HomeView from './HomeView.vue';

const getUploadSignatureMock = vi.fn();
const createParticipantMock = vi.fn();
const uploadPhotoMock = vi.fn();

vi.mock('../api/participants', () => ({
  getUploadSignature: (...args: unknown[]) => getUploadSignatureMock(...args),
  createParticipant: (...args: unknown[]) => createParticipantMock(...args),
}));

vi.mock('../services/cloudinaryUpload', async () => {
  const actual = await vi.importActual<
    typeof import('../services/cloudinaryUpload')
  >('../services/cloudinaryUpload');
  return {
    ...actual,
    uploadPhoto: (...args: unknown[]) => uploadPhotoMock(...args),
  };
});

const signature = {
  cloudName: 'demo',
  apiKey: 'key',
  timestamp: 123,
  signature: 'sig',
  folder: 'ine-photos',
  type: 'authenticated' as const,
};

function fakeFile(): File {
  return new File(['bytes'], 'ine.jpg', { type: 'image/jpeg' });
}

async function fillValidForm(wrapper: ReturnType<typeof mount>): Promise<void> {
  await wrapper.find('input[type="text"]').setValue('Juan Pérez');
  await wrapper.findAll('input[type="text"]')[1]!.setValue('7');
  await wrapper.find('input[type="tel"]').setValue('6441234567');

  const fileInput = wrapper.find('input[type="file"]');
  Object.defineProperty(fileInput.element, 'files', {
    value: [fakeFile()],
  });
  await fileInput.trigger('change');
}

describe('HomeView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
  });

  it('muestra el título del sorteo', () => {
    const wrapper = mount(HomeView);
    expect(wrapper.text()).toContain('Sorteo Diócesis de Ciudad Obregón');
  });

  it('pide completar los campos si se manda vacío', async () => {
    const wrapper = mount(HomeView);

    await wrapper.find('form').trigger('submit');

    expect(wrapper.text()).toContain('Completa todos los campos');
    expect(getUploadSignatureMock).not.toHaveBeenCalled();
  });

  it('pide la foto si los campos están completos pero no hay foto', async () => {
    const wrapper = mount(HomeView);

    await wrapper.find('input[type="text"]').setValue('Juan Pérez');
    await wrapper.findAll('input[type="text"]')[1]!.setValue('7');
    await wrapper.find('input[type="tel"]').setValue('6441234567');
    await wrapper.find('form').trigger('submit');

    expect(wrapper.text()).toContain('Toma la foto de tu INE');
    expect(getUploadSignatureMock).not.toHaveBeenCalled();
  });

  it('rechaza una cartera fuera de rango sin llamar a la API', async () => {
    const wrapper = mount(HomeView);

    await wrapper.find('input[type="text"]').setValue('Juan Pérez');
    await wrapper.findAll('input[type="text"]')[1]!.setValue('999');
    await wrapper.find('input[type="tel"]').setValue('6441234567');
    const fileInput = wrapper.find('input[type="file"]');
    Object.defineProperty(fileInput.element, 'files', {
      value: [fakeFile()],
    });
    await fileInput.trigger('change');

    await wrapper.find('form').trigger('submit');

    expect(wrapper.text()).toContain('entre 1 y 840');
    expect(getUploadSignatureMock).not.toHaveBeenCalled();
  });

  it('en éxito: pide firma, sube la foto, crea el participante y limpia el form', async () => {
    getUploadSignatureMock.mockResolvedValue(signature);
    uploadPhotoMock.mockResolvedValue({
      publicId: 'ine-photos/abc',
      version: '123',
    });
    createParticipantMock.mockResolvedValue({
      id: 'uuid-1',
      createdAt: '2026-01-01',
    });

    const wrapper = mount(HomeView);
    await fillValidForm(wrapper);
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => {
      expect(createParticipantMock).toHaveBeenCalled();
    });

    expect(getUploadSignatureMock).toHaveBeenCalled();
    expect(uploadPhotoMock).toHaveBeenCalledWith(signature, expect.any(File));
    expect(createParticipantMock).toHaveBeenCalledWith({
      name: 'Juan Pérez',
      walletNumber: '007',
      phone: '6441234567',
      photoPublicId: 'ine-photos/abc',
      photoVersion: '123',
    });
    expect(wrapper.text()).toContain('Registro guardado');

    const nameInput = wrapper.find<HTMLInputElement>('input[type="text"]');
    expect(nameInput.element.value).toBe('');
  });

  it('muestra el mensaje del ApiError si el backend rechaza la cartera', async () => {
    getUploadSignatureMock.mockResolvedValue(signature);
    uploadPhotoMock.mockResolvedValue({
      publicId: 'ine-photos/abc',
      version: '123',
    });
    createParticipantMock.mockRejectedValue(
      new ApiError({
        statusCode: 409,
        error: 'wallet_already_taken',
        message: 'La cartera 007 ya está registrada',
      }),
    );

    const wrapper = mount(HomeView);
    await fillValidForm(wrapper);
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('ya está registrada');
    });
  });

  it('muestra el mensaje de CloudinaryUploadError si falla la subida', async () => {
    getUploadSignatureMock.mockResolvedValue(signature);
    uploadPhotoMock.mockRejectedValue(new CloudinaryUploadError());

    const wrapper = mount(HomeView);
    await fillValidForm(wrapper);
    await wrapper.find('form').trigger('submit');
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('No se pudo subir la foto');
    });

    expect(createParticipantMock).not.toHaveBeenCalled();
  });
});
