import { readonly, ref } from 'vue';
import {
  currentIdToken,
  isLoggedIn as getIsLoggedIn,
  onAuthChanged,
  signIn,
  signOutAdmin,
} from '../services/authService';

// Estado compartido a nivel de módulo: hay una sola sesión de admin
// en toda la app, así que todos los componentes que llamen
// useAdminSession() ven el mismo estado reactivo.
const loggedIn = ref(false);
let listening = false;

function ensureListening(): void {
  if (listening) return;
  listening = true;
  loggedIn.value = getIsLoggedIn();
  onAuthChanged((user) => {
    loggedIn.value = user !== null;
  });
}

export function useAdminSession() {
  ensureListening();

  async function login(email: string, password: string): Promise<void> {
    await signIn(email, password);
  }

  async function logout(): Promise<void> {
    await signOutAdmin();
  }

  // Header listo para pegarle a request() de httpClient en llamadas
  // admin. Lanza si no hay sesión — las páginas ya validan
  // isLoggedIn antes de intentar una acción admin, así que esto es
  // una red de seguridad, no el flujo principal.
  async function authHeaders(): Promise<Record<string, string>> {
    const token = await currentIdToken();
    if (!token) {
      throw new Error('No hay sesión de administrador activa');
    }
    return { Authorization: `Bearer ${token}` };
  }

  return {
    isLoggedIn: readonly(loggedIn),
    login,
    logout,
    authHeaders,
  };
}
