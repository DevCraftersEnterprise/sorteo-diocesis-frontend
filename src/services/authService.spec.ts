import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import * as authService from './authService';

interface FakeUser {
  getIdToken: (forceRefresh: boolean) => Promise<string>;
}

const mockAuth: { currentUser: FakeUser | null } = { currentUser: null };

vi.mock('../lib/firebase', () => ({
  getFirebaseApp: vi.fn(() => ({ name: '[DEFAULT]' })),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => mockAuth),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.currentUser = null;
  });

  it('signIn delega en signInWithEmailAndPassword con la instancia de auth', async () => {
    await authService.signIn('admin@example.com', 'secret');

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      mockAuth,
      'admin@example.com',
      'secret',
    );
  });

  it('signOutAdmin delega en signOut', async () => {
    await authService.signOutAdmin();

    expect(signOut).toHaveBeenCalledWith(mockAuth);
  });

  it('currentIdToken devuelve null si no hay sesión', async () => {
    mockAuth.currentUser = null;

    expect(await authService.currentIdToken()).toBeNull();
  });

  it('currentIdToken fuerza el refresh del token (true)', async () => {
    const getIdToken = vi.fn().mockResolvedValue('token-abc');
    mockAuth.currentUser = { getIdToken };

    expect(await authService.currentIdToken()).toBe('token-abc');
    expect(getIdToken).toHaveBeenCalledWith(true);
  });

  it('isLoggedIn refleja auth.currentUser', () => {
    mockAuth.currentUser = null;
    expect(authService.isLoggedIn()).toBe(false);

    mockAuth.currentUser = { getIdToken: vi.fn() };
    expect(authService.isLoggedIn()).toBe(true);
  });

  it('onAuthChanged delega en onAuthStateChanged con la instancia de auth', () => {
    const callback = vi.fn();

    authService.onAuthChanged(callback);

    expect(onAuthStateChanged).toHaveBeenCalledWith(mockAuth, callback);
  });
});
