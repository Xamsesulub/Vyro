// Native notifications are loaded only in a supported installed app.
export function loadNotifications() {
  return import("expo-notifications");
}
