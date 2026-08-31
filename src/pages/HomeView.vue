<script setup lang="ts">
import { computed, ref } from 'vue';
import { Cog6ToothIcon } from '@heroicons/vue/24/outline';
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

const messageClasses = computed(() =>
  message.value?.type === 'success'
    ? 'bg-green-50 text-green-700'
    : 'bg-red-50 text-red-700',
);

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
  <main
    class="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-slate-100 to-slate-200 p-6"
  >
    <form
      class="flex w-full max-w-md flex-col gap-5 rounded-3xl bg-white p-8 shadow-xl ring-1 ring-black/5"
      @submit.prevent="submit"
    >
      <div class="relative mb-1 flex items-center justify-center">
        <h1 class="text-center text-xl font-semibold text-brand-500">
          Sorteo Diócesis de Ciudad Obregón
        </h1>
        <router-link
          to="/admin"
          class="absolute right-0 text-slate-500 opacity-60 transition hover:text-brand-500 hover:opacity-100"
          aria-label="Admin"
        >
          <Cog6ToothIcon class="h-5 w-5" />
        </router-link>
      </div>

      <button
        type="button"
        class="flex h-52 w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-500 hover:shadow-md active:translate-y-0"
        @click="triggerPhotoPicker"
      >
        <img
          v-if="photoPreviewUrl"
          :src="photoPreviewUrl"
          alt="Foto de INE tomada"
          class="h-full w-full object-cover"
        />
        <span v-else class="px-4 text-center text-sm">
          Tocar para tomar foto de INE
        </span>
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        capture="environment"
        class="sr-only"
        @change="onPhotoSelected"
      />

      <label class="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Nombre completo
        <input
          v-model="name"
          type="text"
          autocomplete="name"
          class="rounded-xl border border-slate-300 px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <label class="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Número de cartera
        <input
          v-model="walletNumber"
          type="text"
          inputmode="numeric"
          class="rounded-xl border border-slate-300 px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <label class="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Número de teléfono
        <input
          v-model="phone"
          type="tel"
          autocomplete="tel"
          class="rounded-xl border border-slate-300 px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <p
        v-if="message"
        :class="[
          'rounded-xl px-3.5 py-2.5 text-sm font-medium',
          messageClasses,
        ]"
        role="status"
      >
        {{ message.text }}
      </p>

      <button
        type="submit"
        class="cursor-pointer rounded-xl bg-brand-500 px-4 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
        :disabled="loading"
      >
        {{ loading ? 'Guardando…' : 'Guardar' }}
      </button>

      <p class="text-center text-xs text-slate-500">
        Aviso: la foto se guarda en almacenamiento privado y el teléfono se
        protege.
      </p>
    </form>
  </main>
</template>
