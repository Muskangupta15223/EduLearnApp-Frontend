import fs from 'node:fs/promises';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { jest } from '@jest/globals';

function createStorage(initial = {}) {
  const store = new Map(Object.entries(initial));

  return {
    getItem: jest.fn((key) => (store.has(key) ? store.get(key) : null)),
    setItem: jest.fn((key, value) => {
      store.set(key, String(value));
    }),
    removeItem: jest.fn((key) => {
      store.delete(key);
    }),
    clear: jest.fn(() => {
      store.clear();
    }),
  };
}

export async function loadApiModule({
  env = {},
  storageState = {},
  localStorage = createStorage(storageState),
  window = { dispatchEvent: jest.fn() },
  CustomEvent = class CustomEvent {
    constructor(type) {
      this.type = type;
    }
  },
} = {}) {
  const sourcePath = fileURLToPath(new URL('../../api.js', import.meta.url));
  const source = await fs.readFile(sourcePath, 'utf8');
  const requestInterceptors = [];
  const responseInterceptors = [];

  const axiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn((fulfilled, rejected) => {
          requestInterceptors.push({ fulfilled, rejected });
          return requestInterceptors.length - 1;
        }),
      },
      response: {
        use: jest.fn((fulfilled, rejected) => {
          responseInterceptors.push({ fulfilled, rejected });
          return responseInterceptors.length - 1;
        }),
      },
    },
  };

  const axiosDefault = {
    create: jest.fn(() => axiosInstance),
  };

  const context = vm.createContext({
    Array,
    Boolean,
    console,
    CustomEvent,
    Date,
    Error,
    JSON,
    localStorage,
    Map,
    Math,
    Number,
    Object,
    Promise,
    Set,
    String,
    URLSearchParams,
    window,
  });
  context.globalThis = context;

  const axiosModule = new vm.SyntheticModule(
    ['default'],
    function setAxiosExports() {
      this.setExport('default', axiosDefault);
    },
    { context }
  );

  const module = new vm.SourceTextModule(source, {
    context,
    identifier: sourcePath,
    initializeImportMeta(meta) {
      meta.env = env;
    },
  });

  await module.link(async (specifier) => {
    if (specifier === 'axios') {
      return axiosModule;
    }

    throw new Error(`Unsupported import: ${specifier}`);
  });

  await axiosModule.evaluate();
  await module.evaluate();

  return {
    exports: module.namespace,
    axiosDefault,
    axiosInstance,
    localStorage,
    requestInterceptor: requestInterceptors[0]?.fulfilled,
    responseSuccessInterceptor: responseInterceptors[0]?.fulfilled,
    responseErrorInterceptor: responseInterceptors[0]?.rejected,
    window,
  };
}
