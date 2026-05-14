import { loadApiModule } from './helpers/loadApiModule';

describe('api gateway and auth service', () => {
  test('prefers VITE_API_URL when creating the axios client', async () => {
    const { axiosDefault } = await loadApiModule({
      env: {
        VITE_API_URL: 'http://localhost:8080',
        VITE_API_GATEWAY_URL: 'http://localhost:9090',
      },
    });

    expect(axiosDefault.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'http://localhost:8080',
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  test('falls back to gateway url when direct api url is not configured', async () => {
    const { axiosDefault } = await loadApiModule({
      env: {
        VITE_API_GATEWAY_URL: 'http://gateway.internal',
      },
    });

    expect(axiosDefault.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'http://gateway.internal',
      })
    );
  });

  test('attaches jwt and user context headers in the request interceptor', async () => {
    const { requestInterceptor } = await loadApiModule({
      storageState: {
        edulearn_token: 'jwt-token',
        edulearn_user: JSON.stringify({
          id: 42,
          role: 'ADMIN',
          fullName: 'Riya Sharma',
        }),
      },
    });

    const config = { headers: {} };

    const nextConfig = requestInterceptor(config);

    expect(nextConfig).toBe(config);
    expect(config.headers).toEqual({
      Authorization: 'Bearer jwt-token',
      'X-User-Id': 42,
      'X-User-Role': 'ADMIN',
      'X-User-Name': 'Riya Sharma',
    });
  });

  test('keeps requests working when the stored user payload is malformed', async () => {
    const { requestInterceptor } = await loadApiModule({
      storageState: {
        edulearn_token: 'jwt-token',
        edulearn_user: '{bad-json',
      },
    });

    const config = { headers: {} };

    expect(() => requestInterceptor(config)).not.toThrow();
    expect(config.headers).toEqual({
      Authorization: 'Bearer jwt-token',
    });
  });

  test('clears session and dispatches session-expired on auth bootstrap failures', async () => {
    const { responseErrorInterceptor, localStorage, window } = await loadApiModule({
      storageState: {
        edulearn_token: 'expired-token',
        edulearn_user: JSON.stringify({ id: 12 }),
      },
    });

    const error = {
      response: { status: 401 },
      config: { url: '/auth/me' },
    };

    await expect(responseErrorInterceptor(error)).rejects.toBe(error);
    expect(localStorage.removeItem).toHaveBeenCalledWith('edulearn_token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('edulearn_user');
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'edulearn:session-expired' })
    );
  });

  test('does not clear session for public auth endpoint failures', async () => {
    const { responseErrorInterceptor, localStorage, window } = await loadApiModule({
      storageState: {
        edulearn_token: 'keep-token',
        edulearn_user: JSON.stringify({ id: 9 }),
      },
    });

    const error = {
      response: { status: 401 },
      config: { url: '/auth/login' },
    };

    await expect(responseErrorInterceptor(error)).rejects.toBe(error);
    expect(localStorage.removeItem).not.toHaveBeenCalled();
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });

  test('routes auth api calls through the expected gateway endpoints', async () => {
    const { exports, axiosInstance } = await loadApiModule();

    exports.authAPI.login('riya@mail.com', 'secret');
    exports.authAPI.register({ email: 'riya@mail.com', password: 'secret' });
    exports.authAPI.getMe();

    expect(axiosInstance.post).toHaveBeenNthCalledWith(1, '/auth/login', {
      email: 'riya@mail.com',
      password: 'secret',
    });
    expect(axiosInstance.post).toHaveBeenNthCalledWith(2, '/auth/register', {
      email: 'riya@mail.com',
      password: 'secret',
    });
    expect(axiosInstance.get).toHaveBeenCalledWith('/auth/me');
  });
});
