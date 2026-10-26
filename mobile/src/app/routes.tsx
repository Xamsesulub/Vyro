import { useLocalSearchParams } from "expo-router";
import { AccountGate } from "../components/AccountGate";
import { useAuthStore } from "../stores/useAuthStore";
import { RouteDiscover } from "../features/routes/RouteDiscover";
import { RouteDetail } from "../features/routes/RouteDetail";
import { RouteLibrary } from "../features/routes/RouteLibrary";
import { RouteContribute } from "../features/routes/RouteContribute";
export default function RoutesScreen() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const { id, tab, lat, lon, name } = useLocalSearchParams<{
    id?: string;
    tab?: string;
    lat?: string;
    lon?: string;
    name?: string;
  }>();
  const latitude = Number(lat),
    longitude = Number(lon);
  const initial =
    lat && lon && Number.isFinite(latitude) && Number.isFinite(longitude)
      ? {
          id: "map-area",
          name: (name ?? "Valgt kartområde").slice(0, 120),
          latitude,
          longitude,
        }
      : undefined;
  return (
    <AccountGate>
      {userId &&
        (id ? (
          <RouteDetail
            key={`${userId}:${id}`}
            userId={userId}
            id={id}
            initialName={name?.slice(0, 120)}
          />
        ) : tab === "contribute" ? (
          <RouteContribute key={userId} userId={userId} />
        ) : tab === "saved" ? (
          <RouteLibrary key={userId} userId={userId} />
        ) : (
          <RouteDiscover
            key={`${userId}:${lat}:${lon}`}
            userId={userId}
            initial={initial}
          />
        ))}
    </AccountGate>
  );
}
