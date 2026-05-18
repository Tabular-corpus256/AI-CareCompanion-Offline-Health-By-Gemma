jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(() =>
    Promise.resolve([{ uri: 'file://test', name: 'model.gguf' }]),
  ),
  keepLocalCopy: jest.fn(() =>
    Promise.resolve([
      { status: 'success', sourceUri: 'file://test', localUri: 'file://test' },
    ]),
  ),
  types: {
    allFiles: 'public.all-files',
    images: 'public.images',
    plainText: 'public.plain-text',
  },
  isErrorWithCode: jest.fn(() => false),
  errorCodes: {
    OPERATION_CANCELED: 'OPERATION_CANCELED',
    IN_PROGRESS: 'ASYNC_OP_IN_PROGRESS',
    UNABLE_TO_OPEN_FILE_TYPE: 'UNABLE_TO_OPEN_FILE_TYPE',
  },
}));

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/documents',
  CachesDirectoryPath: '/mock/caches',
  MainBundlePath: '/mock/bundle',
  exists: jest.fn(() => Promise.resolve(false)),
  stat: jest.fn(() => Promise.resolve({ size: 1000000000 })),
  unlink: jest.fn(() => Promise.resolve()),
  moveFile: jest.fn(() => Promise.resolve()),
  copyFile: jest.fn(() => Promise.resolve()),
  downloadFile: jest.fn(() => ({
    promise: Promise.resolve({ statusCode: 200, bytesWritten: 1000 }),
  })),
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

jest.mock('react-native-sqlite-storage', () => {
  const mockRows: any[] = [];
  return {
    enablePromise: jest.fn(),
    openDatabase: jest.fn(() =>
      Promise.resolve({
        executeSql: jest.fn((_sql: string, _params?: any[]) => {
          const results = {
            rows: {
              length: mockRows.length,
              item: (i: number) => mockRows[i],
              raw: () => mockRows,
            },
          };
          return Promise.resolve([results]);
        }),
        transaction: jest.fn((fn: (tx: any) => void) => {
          const tx = {
            executeSql: jest.fn((_sql: string, _params?: any[]) => {
              return Promise.resolve();
            }),
          };
          fn(tx);
        }),
        close: jest.fn(() => Promise.resolve()),
      }),
    ),
  };
});
