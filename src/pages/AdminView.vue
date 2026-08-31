<script setup lang="ts">
import { ref } from 'vue';
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
  <main>
    <form v-if="!isLoggedIn" class="card" @submit.prevent="login">
      <h1>Admin</h1>

      <label>
        Email
        <input v-model="email" type="email" autocomplete="username" />
      </label>

      <label>
        Contraseña
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
        />
      </label>

      <p v-if="message" :class="['message', message.type]" role="status">
        {{ message.text }}
      </p>

      <button type="submit" class="primary" :disabled="loadingLogin">
        {{ loadingLogin ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>

    <div v-else class="card">
      <h1>Admin</h1>

      <button
        type="button"
        class="primary"
        :disabled="loadingZip || loadingPurge"
        @click="downloadZip"
      >
        {{ loadingZip ? 'Descargando…' : 'Descargar ZIP' }}
      </button>

      <button
        type="button"
        class="danger"
        :disabled="loadingZip || loadingPurge"
        @click="purgeDatabase"
      >
        {{ loadingPurge ? 'Borrando…' : 'Borrar base de datos' }}
      </button>

      <button
        type="button"
        class="secondary"
        :disabled="loadingZip || loadingPurge"
        @click="logout"
      >
        Salir
      </button>

      <p v-if="message" :class="['message', message.type]" role="status">
        {{ message.text }}
      </p>
    </div>
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
  max-width: 380px;
  background: #fff;
  border-radius: 20px;
  padding: 32px 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

h1 {
  font-size: 1.25rem;
  text-align: center;
  margin: 0 0 8px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.9rem;
  color: #333;
}

input {
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 10px;
  font-size: 1rem;
}

button {
  padding: 14px;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.primary {
  background: #101541;
  color: #fff;
}

.danger {
  background: #d64545;
  color: #fff;
}

.secondary {
  background: #eee;
  color: #333;
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
</style>
