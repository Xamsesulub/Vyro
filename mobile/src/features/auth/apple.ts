import { signInWithBrowser } from "./socialBrowser";

export async function appleSignInAvailable() {
  return true; // Web uses the configured Apple Services ID through Supabase.
}

export function signInWithApple() {
  return signInWithBrowser("apple");
}
