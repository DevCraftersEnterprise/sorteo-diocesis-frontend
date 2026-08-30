import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeUser = { uid: string } | null;
type AuthChangedCallback = (user: FakeUser) => void;

const authServiceMock = {
  isLoggedIn: vi.fn(() => false),
  onAuthChanged: vi.fn(),
  signIn: vi.fn(),
  signOutAdmin: vi.fn(),
  currentIdToken: vi.fn(),
};

vi.mock('../services/authService', () => authServiceMock);

describe('useAdminSession', () => {
  let capturedCallback: AuthChangedCallback | undefined;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    capturedCallback = undefined;
    authServiceMock.isLoggedIn.mockReturnValue(false);
    authServiceMock.onAuthChanged.mockImplementation(
      (cb: AuthChangedCallback) => {
        capturedCallback = cb;
        return vi.fn();
      },
    );
  });

  it('arranca con isLoggedIn = authService.isLoggedIn() en el primer uso', async () => {
    authServiceMock.isLoggedIn.mockReturnValue(true);
    const { useAdminSession } = await import('./useAdminSession');

    const session = useAdminSession();

    expect(session.isLoggedIn.value).toBe(true);
  });

  it('actualiza isLoggedIn cuando cambia el estado de auth de Firebase', async () => {
    const { useAdminSession } = await import('./useAdminSession');
    const session = useAdminSession();

    capturedCallback?.({ uid: 'admin-1' });
    expect(session.isLoggedIn.value).toBe(true);

    capturedCallback?.(null);
    expect(session.isLoggedIn.value).toBe(false);
  });

  it('comparte el mismo estado entre varias llamadas y solo registra un listener', async () => {
    const { useAdminSession } = await import('./useAdminSession');
    const a = useAdminSession();
    const b = useAdminSession();

    capturedCallback?.({ uid: 'admin-1' });

    expect(a.isLoggedIn.value).toBe(true);
    expect(b.isLoggedIn.value).toBe(true);
    expect(authServiceMock.onAuthChanged).toHaveBeenCalledTimes(1);
  });

  it('login delega en authService.signIn', async () => {
    const { useAdminSession } = await import('./useAdminSession');
    const session = useAdminSession();

    await session.login('admin@example.com', 'secret');

    expect(authServiceMock.signIn).toHaveBeenCalledWith(
      'admin@example.com',
      'secret',
    );
  });

  it('logout delega en authService.signOutAdmin', async () => {
    const { useAdminSession } = await import('./useAdminSession');
    const session = useAdminSession();

    await session.logout();

    expect(authServiceMock.signOutAdmin).toHaveBeenCalled();
  });

  it('authHeaders arma el header Authorization con el ID token', async () => {
    authServiceMock.currentIdToken.mockResolvedValue('token-abc');
    const { useAdminSession } = await import('./useAdminSession');
    const session = useAdminSession();

    const headers = await session.authHeaders();

    expect(headers).toEqual({ Authorization: 'Bearer token-abc' });
  });

  it('authHeaders lanza si no hay sesión activa', async () => {
    authServiceMock.currentIdToken.mockResolvedValue(null);
    const { useAdminSession } = await import('./useAdminSession');
    const session = useAdminSession();

    await expect(session.authHeaders()).rejects.toThrow(
      'No hay sesión de administrador activa',
    );
  });
});
