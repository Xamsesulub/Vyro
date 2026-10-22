import { Redirect } from "expo-router";
// Keep old links working; progress, goals and history now share one screen.
export default function Progress() {
  return <Redirect href="/profile" />;
}
