import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import LiveMap from "./LiveMap";
import { Txt, useTheme } from "./ui";
import { routeSegments, type RoutePoint } from "../features/tracking/gps";
import { footballHeatmap } from "../features/football/heatmap";
import { validMaxSpeed } from "../features/football/speed";

export function FootballSpeed({ value }: { value?: number | null }) {
  return (
    <View style={{ gap: 4 }}>
      <Txt weight="700" size={24}>
        {validMaxSpeed(value)
          ? `${value.toLocaleString("nb-NO", { maximumFractionDigits: 1 })} km/t`
          : "—"}
      </Txt>
      <Txt muted size={12}>
        Maksfart · GPS over 5 sekunder
      </Txt>
      {!validMaxSpeed(value) && (
        <Txt muted size={12}>
          Ikke nok nøyaktige målinger i denne økten.
        </Txt>
      )}
    </View>
  );
}

export default function FootballMap({
  points,
  height = 310,
}: {
  points: RoutePoint[];
  height?: number;
}) {
  const c = useTheme();
  const [mode, setMode] = useState<"route" | "heat">("route");
  const route = useMemo(() => routeSegments(points), [points]);
  const heatmap = useMemo(() => footballHeatmap(points), [points]);
  return (
    <View style={{ gap: 12 }}>
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: "row",
          padding: 4,
          gap: 4,
          borderRadius: 18,
          backgroundColor: c.raised,
        }}
      >
        {(
          [
            ["route", "Rute"],
            ["heat", "Varmekart"],
          ] as const
        ).map(([value, label]) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: mode === value }}
            onPress={() => setMode(value)}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              backgroundColor: mode === value ? c.bg : "transparent",
            }}
          >
            <Txt weight="700" size={14}>
              {label}
            </Txt>
          </Pressable>
        ))}
      </View>
      <View style={{ borderRadius: 20, overflow: "hidden" }}>
        {route.some((segment) => segment.length > 1) ? (
          <LiveMap
            route={route}
            height={height}
            mapKind="satellite"
            heatmap={mode === "heat" ? heatmap : null}
          />
        ) : (
          <Txt muted size={13}>
            Ingen synlig rute i kartet.
          </Txt>
        )}
      </View>
      {mode === "heat" &&
        (heatmap ? (
          <>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Txt muted size={12}>
                Mindre
              </Txt>
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  borderRadius: 5,
                  overflow: "hidden",
                }}
              >
                {["#8FEB23", "#C5EB23", "#FFEB23", "#FF9423", "#FF3C23"].map(
                  (color) => (
                    <View
                      key={color}
                      style={{ flex: 1, height: 7, backgroundColor: color }}
                    />
                  ),
                )}
              </View>
              <Txt muted size={12}>
                Mer bevegelse
              </Txt>
            </View>
            <Txt muted size={12}>
              Viser hvor du beveget deg mest, ikke tiden du sto stille. GPS kan
              avvike fra banen.
            </Txt>
          </>
        ) : (
          <Txt muted size={12}>
            For lite sammenhengende GPS-rute til å vise varmekart.
          </Txt>
        ))}
    </View>
  );
}
