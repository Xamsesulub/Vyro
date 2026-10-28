import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { client } from "./api";
import { requireOwner } from "./profiles";
import { loadNotifications } from "./notificationRuntime";
export const pushSupported =
  Platform.OS === "ios" &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
const installationKey = "vyro-push-installation-v1";
let installation: Promise<string> | undefined;
function getInstallation() {
  installation ??= (async () => {
    const existing = await AsyncStorage.getItem(installationKey);
    if (existing) return existing;
    const value = randomUUID();
    await AsyncStorage.setItem(installationKey, value);
    return value;
  })().catch((e) => {
    installation = undefined;
    throw e;
  });
  return installation;
}
const preferenceKey = (owner: string) => `vyro-push-opt-in:${owner}`;
// Serialize changes so an automatic refresh cannot undo a later explicit opt-out.
let pending: Promise<unknown> = Promise.resolve();
function serial<T>(operation: () => Promise<T>): Promise<T> {
  const next = pending.then(operation, operation);
  pending = next.catch(() => undefined);
  return next;
}
async function timeout<T>(operation: Promise<T>, ms = 20000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error("Kunne ikke koble til varseltjenesten. Prøv igjen."),
            ),
          ms,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
export async function pushPreference(owner: string) {
  return (await AsyncStorage.getItem(preferenceKey(owner))) === "true";
}
export function enablePush(owner: string, ask = true) {
  return serial(() => registerPush(owner, ask));
}
async function registerPush(owner: string, ask: boolean) {
  if (!pushSupported)
    throw new Error(
      "Åpne den installerte VYRO-appen på iPhone for å slå på telefonvarsler.",
    );
  requireOwner(owner);
  if (!ask && !(await pushPreference(owner))) return;
  const N = await loadNotifications();
  let permissions = await N.getPermissionsAsync();
  if (!permissions.granted && ask)
    permissions = await N.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: true },
    });
  requireOwner(owner);
  if (!permissions.granted)
    throw new Error("Tillat varsler for VYRO i telefonens innstillinger.");
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId)
    throw new Error("Denne appversjonen er ikke satt opp for telefonvarsler.");
  const token = await timeout(N.getExpoPushTokenAsync({ projectId }));
  const installationId = await getInstallation();
  requireOwner(owner);
  const result = await client()
    .rpc("vyro_register_push", {
      p_installation: installationId,
      p_token: token.data,
    })
    .abortSignal(AbortSignal.timeout(8000));
  if (result.error) throw result.error;
  requireOwner(owner);
  await AsyncStorage.setItem(preferenceKey(owner), "true");
}
export function disablePush(owner: string) {
  return serial(() => unregisterPush(owner));
}
async function unregisterPush(owner: string) {
  const installationId = await getInstallation();
  requireOwner(owner);
  const result = await client()
    .rpc("vyro_disable_push", {
      p_installation: installationId,
    })
    .abortSignal(AbortSignal.timeout(8000));
  if (result.error) throw result.error;
  requireOwner(owner);
  await AsyncStorage.setItem(preferenceKey(owner), "false");
}
export async function pushStatus(owner: string) {
  await pending;
  if (!pushSupported || !(await pushPreference(owner))) return false;
  const N = await loadNotifications();
  const permissions = await N.getPermissionsAsync();
  const result = await client()
    .rpc("vyro_push_enabled", {
      p_installation: await getInstallation(),
    })
    .abortSignal(AbortSignal.timeout(8000));
  if (result.error) throw result.error;
  requireOwner(owner);
  return permissions.granted && result.data === true;
}
export async function preparePushSignOut(owner: string) {
  // Revoked Auth sessions are also rejected by the worker, including offline sign-out.
  if (!pushSupported) return;
  try {
    await timeout(disablePush(owner), 3000);
  } catch {
    /* Signing out must remain possible without a network connection. */
  }
}
export function isOwnNotification(
  data: Record<string, unknown> | undefined,
  owner?: string,
) {
  return (
    !!owner && data?.screen === "notifications" && data.recipientId === owner
  );
}
