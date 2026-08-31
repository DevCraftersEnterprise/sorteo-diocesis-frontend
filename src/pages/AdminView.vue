<script setup lang="ts">
import { computed, ref } from 'vue';
import { FirebaseError } from 'firebase/app';
import { exportZip, purgeAll } from '../api/admin';
import { ApiError } from '../api/httpClient';
import { useAdminSession } from '../composables/useAdminSession';
import { downloadBlob } from '../utils/downloadBlob';

const {
  isLoggedIn,
  login: sessionLogin,
  logout: sessionLogout,
  authHeaders,
} = useAdminSession();

const email = ref('');
const password = ref('');
const loadingLogin = ref(false);
const loadingZip = ref(false);
const loadingPurge = ref(false);
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null);

const messageClasses = computed(() =>
  message.value?.type === 'success'
    ? 'bg-green-50 text-green-700'
    : 'bg-red-50 text-red-700',
);

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof FirebaseError) {
    return `Error de autenticación: ${error.code}`;
  }
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}

async function login(): Promise<void> {
  message.value = null;

  if (!email.value.trim() || !password.value) {
    message.value = {
      type: 'error',
      text: 'Completa el email y la contraseña.',
    };
    return;
  }

  loadingLogin.value = true;
  try {
    await sessionLogin(email.value.trim(), password.value);
    password.value = '';
    message.value = { type: 'success', text: 'Admin conectado.' };
  } catch (error) {
    message.value = { type: 'error', text: errorMessage(error) };
  } finally {
    loadingLogin.value = false;
  }
}

async function downloadZip(): Promise<void> {
  message.value = null;
  loadingZip.value = true;
  try {
    const headers = await authHeaders();
    const blob = await exportZip(headers);
    downloadBlob(blob, `sorteo_export_${Date.now()}.zip`);
  } catch (error) {
    message.value = { type: 'error', text: errorMessage(error) };
  } finally {
    loadingZip.value = false;
  }
}

async function purgeDatabase(): Promise<void> {
  const confirmed = window.confirm(
    'Se eliminarán TODOS los registros.\nSugerencia: exporta el ZIP antes.\n\n¿Borrar todo?',
  );
  if (!confirmed) return;

  message.value = null;
  loadingPurge.value = true;
  try {
    const headers = await authHeaders();
    const summary = await purgeAll(headers);
    message.value = {
      type: 'success',
      text: `Purga completada. Registros: ${summary.deletedParticipants}, Fotos: ${summary.deletedPhotos}.`,
    };
  } catch (error) {
    message.value = { type: 'error', text: errorMessage(error) };
  } finally {
    loadingPurge.value = false;
  }
}

async function logout(): Promise<void> {
  await sessionLogout();
  message.value = { type: 'success', text: 'Sesión cerrada.' };
}
</script>

<template>
  <main
    class="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-slate-100 to-slate-200 p-6"
  >
    <form
      v-if="!isLoggedIn"
      class="flex w-full max-w-sm flex-col gap-5 rounded-3xl bg-white p-8 shadow-xl ring-1 ring-black/5"
      @submit.prevent="login"
    >
      <h1 class="text-center text-xl font-semibold text-brand-500">Admin</h1>

      <label class="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Email
        <input
          v-model="email"
          type="email"
          autocomplete="username"
          class="rounded-xl border border-slate-300 px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </label>

      <label class="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Contraseña
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
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
        :disabled="loadingLogin"
      >
        {{ loadingLogin ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>

    <div
      v-else
      class="flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-white p-8 shadow-xl ring-1 ring-black/5"
    >
      <h1 class="text-center text-xl font-semibold text-brand-500">Admin</h1>

      <button
        type="button"
        data-testid="download-zip-button"
        class="cursor-pointer rounded-xl bg-brand-500 px-4 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
        :disabled="loadingZip || loadingPurge"
        @click="downloadZip"
      >
        {{ loadingZip ? 'Descargando…' : 'Descargar ZIP' }}
      </button>

      <router-link
        to="/admin/unpaid"
        class="cursor-pointer rounded-xl bg-slate-100 px-4 py-3.5 text-center text-base font-semibold text-slate-700 transition-all duration-150 hover:-translate-y-0.5 hover:bg-slate-200 hover:shadow-md active:translate-y-0"
      >
        Carteras sin pagar
      </router-link>

      <button
        type="button"
        data-testid="purge-button"
        class="cursor-pointer rounded-xl bg-red-600 px-4 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
        :disabled="loadingZip || loadingPurge"
        @click="purgeDatabase"
      >
        {{ loadingPurge ? 'Borrando…' : 'Borrar base de datos' }}
      </button>

      <button
        type="button"
        data-testid="logout-button"
        class="cursor-pointer rounded-xl bg-slate-100 px-4 py-3.5 text-base font-semibold text-slate-700 transition-all duration-150 hover:-translate-y-0.5 hover:bg-slate-200 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
        :disabled="loadingZip || loadingPurge"
        @click="logout"
      >
        Salir
      </button>

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
    </div>
  </main>
</template>
