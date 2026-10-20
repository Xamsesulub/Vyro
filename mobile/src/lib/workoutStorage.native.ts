import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import {
  AESEncryptionKey,
  AESSealedData,
  aesEncryptAsync,
  aesDecryptAsync,
} from "expo-crypto";
import { encryptedStorage } from "./encryptedStorage";

const keyName = "vyro-workout-encryption-v1";
async function key(create: boolean) {
  const encoded = await SecureStore.getItemAsync(keyName);
  if (encoded) return AESEncryptionKey.import(encoded, "hex");
  if (!create) throw new Error("Encryption key unavailable");
  if (
    (await AsyncStorage.getAllKeys()).some(
      (k) => k.startsWith("vyro-") && k.endsWith(".encrypted-v1"),
    )
  )
    throw new Error("Existing encrypted data has no key");
  const generated = await AESEncryptionKey.generate();
  await SecureStore.setItemAsync(keyName, await generated.encoded("hex"), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
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
