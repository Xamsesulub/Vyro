import { useEffect, useState } from "react";
import { client } from "./api";
import { useAuthStore } from "../../stores/useAuthStore";
const cache = new Map<string, { url: string; expires: number }>();
const pending = new Map<string, Promise<string | null>>();
useAuthStore.subscribe((s, p) => {
  if (s.session?.user.id !== p.session?.user.id) {
    cache.clear();
    pending.clear();
  }
});
async function photoUrl(owner: string, path: string) {
  const key = `${owner}:${path}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.url;
  if (pending.has(key)) return pending.get(key)!;
  const request = (async () => {
    const { data, error } = await client()
      .storage.from("profile-photos")
      .createSignedUrl(path, 60);
    if (error || !data || useAuthStore.getState().session?.user.id !== owner)
      return null;
    if (cache.size >= 200) cache.clear();
    cache.set(key, { url: data.signedUrl, expires: Date.now() + 50000 });
    return data.signedUrl;
  })()
    .catch(() => null)
    .finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}
export function useAvatar(path?: string | null) {
  const owner = useAuthStore((s) => s.session?.user.id);
  const [value, setValue] = useState<{ key: string; url: string | null }>();
  const key = `${owner}:${path}`;
  useEffect(() => {
    let alive = true;
    if (owner && path)
      void photoUrl(owner, path).then((url) => {
        if (alive) setValue({ key, url });
      });
    return () => {
      alive = false;
    };
  }, [owner, path, key]);
  return value?.key === key ? value.url : null;
}
