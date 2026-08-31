<script setup lang="ts">
import { ref } from 'vue';
import { ApiError } from '../api/httpClient';
import { createParticipant, getUploadSignature } from '../api/participants';
import {
  CloudinaryUploadError,
  uploadPhoto,
} from '../services/cloudinaryUpload';
import { padWallet } from '../utils/wallet';

const name = ref('');
const walletNumber = ref('');
const phone = ref('');
const photoFile = ref<File | null>(null);
const photoPreviewUrl = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const loading = ref(false);
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null);

function triggerPhotoPicker(): void {
  fileInput.value?.click();
}

function onPhotoSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  photoFile.value = file;
  if (photoPreviewUrl.value) URL.revokeObjectURL(photoPreviewUrl.value);
  photoPreviewUrl.value = URL.createObjectURL(file);
}

function resetForm(): void {
  name.value = '';
  walletNumber.value = '';
  phone.value = '';
  photoFile.value = null;
  if (photoPreviewUrl.value) URL.revokeObjectURL(photoPreviewUrl.value);
  photoPreviewUrl.value = null;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof CloudinaryUploadError) {
    return error.message;
  }
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}

async function submit(): Promise<void> {
  message.value = null;

  if (!name.value.trim() || !walletNumber.value.trim() || !phone.value.trim()) {
    message.value = { type: 'error', text: 'Completa todos los campos.' };
    return;
  }

  if (!photoFile.value) {
    message.value = { type: 'error', text: 'Toma la foto de tu INE.' };
    return;
  }

  const wallet = padWallet(walletNumber.value);
  if (!wallet) {
    message.value = {
      type: 'error',
      text: 'La cartera debe ser un número entre 1 y 840.',
    };
    return;
  }

  loading.value = true;
  try {
    const signature = await getUploadSignature();
    const uploaded = await uploadPhoto(signature, photoFile.value);
    await createParticipant({
      name: name.value.trim(),
      walletNumber: wallet,
      phone: phone.value.trim(),
      photoPublicId: uploaded.publicId,
      photoVersion: uploaded.version,
    });

    message.value = { type: 'success', text: 'Registro guardado. ¡Gracias!' };
    resetForm();
  } catch (error) {
    message.value = { type: 'error', text: errorMessage(error) };
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main>
    <form class="card" @submit.prevent="submit">
      <div class="header-row">
        <h1>Sorteo Diócesis de Ciudad Obregón</h1>
        <router-link to="/admin" class="admin-link" aria-label="Admin">
          ⚙️
        </router-link>
      </div>

      <button type="button" class="photo-picker" @click="triggerPhotoPicker">
        <img
          v-if="photoPreviewUrl"
          :src="photoPreviewUrl"
          alt="Foto de INE tomada"
        />
        <span v-else>Tocar para tomar foto de INE</span>
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        capture="environment"
        class="visually-hidden"
        @change="onPhotoSelected"
      />

      <label>
        Nombre completo
        <input v-model="name" type="text" autocomplete="name" />
      </label>

      <label>
        Número de cartera
        <input v-model="walletNumber" type="text" inputmode="numeric" />
      </label>

      <label>
        Número de teléfono
        <input v-model="phone" type="tel" autocomplete="tel" />
      </label>

      <p v-if="message" :class="['message', message.type]" role="status">
        {{ message.text }}
      </p>

      <button type="submit" class="submit" :disabled="loading">
        {{ loading ? 'Guardando…' : 'Guardar' }}
      </button>

      <p class="notice">
        Aviso: la foto se guarda en almacenamiento privado y el teléfono se
        protege.
      </p>
    </form>
  </main>
</template>

<style scoped>
main {
  display: flex;
  justify-content: center;
  padding: 24px;
  min-height: 100vh;
}

.card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 20px;
  padding: 32px 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin: 0 0 8px;
}

h1 {
  font-size: 1.25rem;
  text-align: center;
  margin: 0;
}

.admin-link {
  position: absolute;
  right: 0;
  text-decoration: none;
  font-size: 1.1rem;
}

.photo-picker {
  height: 200px;
  border: 2px dashed #ccc;
  border-radius: 16px;
  background: #f7f7f8;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  cursor: pointer;
  padding: 0;
  overflow: hidden;
}

.photo-picker img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.9rem;
  color: #333;
}

input[type='text'],
input[type='tel'] {
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 10px;
  font-size: 1rem;
}

.message {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 0.9rem;
}

.message.success {
  background: #e6f6ea;
  color: #1e7a34;
}

.message.error {
  background: #fdeaea;
  color: #a4222c;
}

.submit {
  padding: 14px;
  border: none;
  border-radius: 10px;
  background: #101541;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
}

.submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.notice {
  margin: 0;
  font-size: 0.75rem;
  color: #777;
  text-align: center;
}
</style>
