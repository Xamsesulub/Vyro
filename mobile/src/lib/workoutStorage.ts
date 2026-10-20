import AsyncStorage from "@react-native-async-storage/async-storage";
import { encryptedStorage } from "./encryptedStorage";

// Browser preview: non-exportable key in IndexedDB, never in localStorage.
// Same-origin JavaScript can still use this key; this is not protection against XSS.
async function key(create: boolean): Promise<CryptoKey> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("vyro-private-keys", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("keys");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    const existing = await new Promise<CryptoKey | undefined>(
      (resolve, reject) => {
        const request = db
          .transaction("keys")
          .objectStore("keys")
          .get("workouts");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      },
    );
    if (existing) return existing;
    if (!create) throw new Error("Encryption key unavailable");
    if (
      (await AsyncStorage.getAllKeys()).some(
        (k) => k.startsWith("vyro-") && k.endsWith(".encrypted-v1"),
      )
    )
      throw new Error("Existing encrypted data has no key");
    const generated = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    return await new Promise<CryptoKey>((resolve, reject) => {
      const tx = db.transaction("keys", "readwrite");
      const store = tx.objectStore("keys");
      const request = store.get("workouts");
      let selected = generated;
      request.onsuccess = () => {
        if (request.result) selected = request.result;
        else store.add(generated, "workouts");
      };
      tx.oncomplete = () => resolve(selected);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
export const workoutStorage = encryptedStorage(AsyncStorage, {
  async encrypt(value, allowCreate) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await key(allowCreate),
      new TextEncoder().encode(value),
    );
    return JSON.stringify({
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted)),
    });
  },
  async decrypt(value) {
    const { iv, data } = JSON.parse(value);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      await key(false),
      new Uint8Array(data),
    );
    return new TextDecoder().decode(plain);
  },
});
