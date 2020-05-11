import LRUCache from "lru-cache";

export interface ZipeCache<K = string, T = any> {
  set(key: K, v: T): void;
  get<T>(key: K): T | Promise<T>;
  has(key: K): boolean | Promise<boolean>;
  delete(key: K): void;
}

export function buildMemoryCache(): ZipeCache {
  const cache = new LRUCache();
  // return new Map();
  return {
    set(k, v) {
      cache.set(k, v);
    },
    get(k) {
      return cache.get(k);
    },
    has(k) {
      return cache.has(k);
    },
    delete(k) {
      return cache.del(k);
    },
  };
}
