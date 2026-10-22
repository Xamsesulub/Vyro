import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import {
  AESEncryptionKey,
  AESSealedData,
  aesEncryptAsync,
  aesDecryptAsync,
} from "expo-crypto";
import { encryptedStorage } from "./encryptedStorage";

let keyAccessibilityUpdated = false;
const keyName = "vyro-workout-encryption-v1";
// All persisted stores share one encryption key. Serialise creation across keys,
// not only individual storage records, to avoid first-launch key replacement.
let keyOperations: Promise<unknown> = Promise.resolve();
function key(create: boolean) {
  const next = keyOperations.then(() => readKey(create));
  keyOperations = next.catch(() => undefined);
  return next;
}
async function readKey(create: boolean) {
  const encoded = await SecureStore.getItemAsync(keyName);
  if (encoded) {
    if (!keyAccessibilityUpdated) {
      await SecureStore.setItemAsync(keyName, encoded, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      });
      keyAccessibilityUpdated = true;
    }
    return AESEncryptionKey.import(encoded, "hex");
  }
  if (!create) throw new Error("Encryption key unavailable");
  if (
    (await AsyncStorage.getAllKeys()).some(
      (k) => k.startsWith("vyro-") && k.endsWith(".encrypted-v1"),
    )
  )
    throw new Error("Existing encrypted data has no key");
  const generated = await AESEncryptionKey.generate();
  await SecureStore.setItemAsync(keyName, await generated.encoded("hex"), {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  keyAccessibilityUpdated = true;
  return generated;
}
export const workoutStorage = encryptedStorage(AsyncStorage, {
  async encrypt(value, allowCreate) {
    const sealed = await aesEncryptAsync(
      new TextEncoder().encode(value),
      await key(allowCreate),
    );
    return sealed.combined("base64");
  },
  async decrypt(value) {
    const plain = await aesDecryptAsync(
      AESSealedData.fromCombined(value),
      await key(false),
    );
    return new TextDecoder().decode(plain);
  },
});
