/** Generated handles remain valid for links/search, but aren't useful display names. */
export function visibleUsername(username: string): string | null {
  return /^runner_[a-f0-9]{32}$/i.test(username) ? null : `@${username}`;
}
