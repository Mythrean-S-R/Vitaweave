// In-memory AsyncStorage mock for Jest tests
const store = new Map();

const mockAsyncStorage = {
  getItem: jest.fn((key) => Promise.resolve(store.has(key) ? store.get(key) : null)),
  setItem: jest.fn((key, value) => {
    store.set(key, value);
    return Promise.resolve();
  }),
  removeItem: jest.fn((key) => {
    store.delete(key);
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    store.clear();
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve([...store.keys()])),
  multiGet: jest.fn((keys) =>
    Promise.resolve(keys.map((key) => [key, store.has(key) ? store.get(key) : null]))
  ),
  multiSet: jest.fn((pairs) => {
    pairs.forEach(([key, value]) => store.set(key, value));
    return Promise.resolve();
  }),
  multiRemove: jest.fn((keys) => {
    keys.forEach((key) => store.delete(key));
    return Promise.resolve();
  }),
};

export default mockAsyncStorage;
