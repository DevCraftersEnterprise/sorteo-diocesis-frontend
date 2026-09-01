<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { FirebaseError } from 'firebase/app';
import { fetchUnpaid, markAsPaid, type UnpaidParticipant } from '../api/admin';
import { ApiError } from '../api/httpClient';
import { useAdminSession } from '../composables/useAdminSession';

const DEBOUNCE_MS = 350;

const { isLoggedIn, authHeaders } = useAdminSession();

const query = ref('');
const items = ref<UnpaidParticipant[]>([]);
const loading = ref(false);
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null);

const messageClasses = computed(() =>
  message.value?.type === 'success'
    ? 'bg-green-50 text-green-700'
    : 'bg-red-50 text-red-700',
);

let debounceTimer: ReturnType<typeof setTimeout> | undefined;

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof FirebaseError) {
    return `Error de autenticación: ${error.code}`;
  }
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}

async function fetchItems(): Promise<void> {
  message.value = null;
  loading.value = true;
  try {
    const headers = await authHeaders();
    items.value = await fetchUnpaid(headers, query.value.trim());
  } catch (error) {
    message.value = { type: 'error', text: errorMessage(error) };
  } finally {
    loading.value = false;
  }
}

function onSearchInput(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchItems, DEBOUNCE_MS);
}

async function confirmMark(item: UnpaidParticipant): Promise<void> {
  const confirmed = window.confirm(
    `¿Marcar como pagada la cartera ${item.walletNumber} de "${item.name}"?`,
  );
  if (!confirmed) return;

  message.value = null;
  loading.value = true;
  try {
    const headers = await authHeaders();
    await markAsPaid(headers, item.walletNumber);
    await fetchItems();
  } catch (error) {
    message.value = { type: 'error', text: errorMessage(error) };
    loading.value = false;
  }
}

onMounted(() => {
  if (isLoggedIn.value) fetchItems();
});
</script>

<template>
  <main
    class="flex min-h-screen justify-center bg-gradient-to-br from-brand-50 via-slate-100 to-slate-200 p-6"
  >
    <div class="w-full max-w-lg">
      <div class="mb-4 flex items-center gap-3">
        <router-link
          to="/admin"
          class="flex shrink-0 cursor-pointer items-center gap-1 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-brand-500 shadow-sm ring-1 ring-black/5 transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-50 hover:shadow-md active:translate-y-0"
        >
          ← Volver
        </router-link>
        <h1 class="flex-1 text-center text-xl font-semibold text-brand-500">
          Carteras sin pagar
        </h1>
      </div>

      <div
        v-if="!isLoggedIn"
        class="rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-black/5"
      >
        <p class="text-slate-600">
          Inicia sesión como admin para ver esta página.
        </p>
        <router-link
          to="/admin"
          class="mt-4 inline-block cursor-pointer rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-md"
        >
          Ir a login
        </router-link>
      </div>

      <div v-else class="flex flex-col gap-4">
        <div class="flex gap-2">
          <label class="sr-only" for="unpaid-search">
            Buscar por nombre o cartera
          </label>
          <input
            id="unpaid-search"
            v-model="query"
            type="search"
            placeholder="Buscar por nombre o cartera (ej. 120)"
            class="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            @input="onSearchInput"
          />
          <button
            type="button"
            data-testid="refresh-button"
            :disabled="loading"
            class="cursor-pointer rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-150 hover:-translate-y-0.5 hover:bg-slate-200 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            @click="fetchItems"
          >
            ↻
          </button>
        </div>

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

        <p
          v-if="!loading && items.length === 0"
          class="text-center text-sm text-slate-500"
        >
          No hay carteras pendientes
        </p>

        <ul v-else class="flex flex-col gap-3">
          <li
            v-for="item in items"
            :key="item.id"
            class="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
          >
            <div class="flex items-center gap-3">
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600"
              >
                {{ item.walletNumber }}
              </span>
              <div>
                <p class="font-medium text-slate-900">{{ item.name }}</p>
                <p class="text-xs text-slate-500">
                  Cartera: {{ item.walletNumber }}
                </p>
              </div>
            </div>
            <button
              type="button"
              data-testid="mark-paid-button"
              :disabled="loading"
              class="cursor-pointer rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              @click="confirmMark(item)"
            >
              Marcar pagado
            </button>
          </li>
        </ul>
      </div>
    </div>
  </main>
</template>
