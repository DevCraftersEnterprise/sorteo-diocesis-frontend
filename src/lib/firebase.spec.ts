import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: '[DEFAULT]' })),
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('VITE_FIREBASE_API_KEY', 'key-123');
  vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'sorteo-app.firebaseapp.com');
  vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'sorteo-app');
  vi.stubEnv('VITE_FIREBASE_APP_ID', 'app-123');
  vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', 'sender-123');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getFirebaseApp', () => {
  it('inicializa Firebase una sola vez con la config armada desde las env vars', async () => {
    const { initializeApp } = await import('firebase/app');
    const { getFirebaseApp } = await import('./firebase');

    const app1 = getFirebaseApp();
    const app2 = getFirebaseApp();

    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(initializeApp).toHaveBeenCalledWith({
      apiKey: 'key-123',
      authDomain: 'sorteo-app.firebaseapp.com',
      projectId: 'sorteo-app',
      appId: 'app-123',
      messagingSenderId: 'sender-123',
    });
    expect(app1).toBe(app2);
  });
});
