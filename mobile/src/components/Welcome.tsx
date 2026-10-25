import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Button, Icon, Logo, Txt, useTheme } from "./ui";
import { BrandMark } from "./Brand";
import { useAppStore } from "../stores/useAppStore";
import { useAuthStore } from "../stores/useAuthStore";

const slides = [
  {
    title: "Ta turen videre.",
    text: "Finn nye veier. Ta vare på turene du vil tilbake til.",
    label: "UTFORSK",
  },
  {
    title: "Din økt. Ditt tempo.",
    text: "Løp, gå eller sykle. Følg tid, distanse og ruten din.",
    label: "BEVEG DEG",
  },
  {
    title: "Flere turer sammen.",
    text: "Finn folkene dine. Del en økt eller et fint sted fra turen.",
    label: "DEL ØYEBLIKKET",
  },
] as const;

export function Welcome({ standalone = false }: { standalone?: boolean }) {
  const c = useTheme();
  const { width, height, fontScale } = useWindowDimensions();
  const pageWidth = Math.min(width, 680);
  const artHeight = Math.max(
    130,
    Math.min(280, height * (fontScale > 1.2 ? 0.23 : 0.32)),
  );
  const [index, setIndex] = useState(0);
  const pager = useRef<FlatList>(null);
  const confirmation = useAuthStore((s) => s.confirmationEmail);
  useEffect(() => {
    pager.current?.scrollToOffset({
      offset: index * pageWidth,
      animated: false,
    });
  }, [pageWidth, index]);
  const open = (mode: "login" | "register") => {
    useAppStore.getState().preferences({ onboarded: true });
    router.push({ pathname: "/account", params: { mode } });
  };
  return (
    <SafeAreaView
      edges={
        standalone
          ? ["top", "left", "right", "bottom"]
          : ["top", "left", "right"]
      }
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 6 }}>
        <Logo width={174} color={c.text} />
      </View>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingVertical: 8,
        }}
      >
        <FlatList
          ref={pager}
          horizontal
          pagingEnabled
          scrollEnabled
          showsHorizontalScrollIndicator={false}
          data={slides}
          keyExtractor={(slide) => slide.label}
          style={{ width: pageWidth, alignSelf: "center", flexGrow: 0 }}
          getItemLayout={(_, i) => ({
            length: pageWidth,
            offset: i * pageWidth,
            index: i,
          })}
          onMomentumScrollEnd={(e) =>
            setIndex(
              Math.max(
                0,
                Math.min(
                  2,
                  Math.round(e.nativeEvent.contentOffset.x / pageWidth),
                ),
              ),
            )
          }
          renderItem={({ item, index: slideIndex }) => (
            <View
              style={{
                width: pageWidth,
                paddingHorizontal: 22,
                gap: 20,
                alignItems: "center",
              }}
            >
              <WelcomeArt variant={slideIndex} height={artHeight} />
              <View style={{ gap: 10, maxWidth: 420, paddingHorizontal: 2 }}>
                <Txt
                  size={11}
                  weight="700"
                  style={{
                    textAlign: "center",
                    color: c.accent,
                    letterSpacing: 1.6,
                  }}
                >
                  {item.label}
                </Txt>
                <Txt
                  size={height < 700 ? 27 : 32}
                  weight="800"
                  style={{ textAlign: "center", letterSpacing: -0.8 }}
                >
                  {item.title}
                </Txt>
                <Txt size={15} muted style={{ textAlign: "center" }}>
                  {item.text}
                </Txt>
              </View>
            </View>
          )}
        />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 12,
          }}
        >
          {slides.map((slide, i) => (
            <Pressable
              key={slide.label}
              accessibilityRole="button"
              accessibilityLabel={`Vis introduksjon ${i + 1}: ${slide.title}`}
              accessibilityState={{ selected: i === index }}
              onPress={() => setIndex(i)}
              style={{
                width: 36,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: i === index ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === index ? c.accent : c.border,
                }}
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <View
        style={{
          paddingHorizontal: 22,
          paddingTop: 8,
          paddingBottom: 14,
          gap: 10,
          maxWidth: 540,
          width: "100%",
          alignSelf: "center",
        }}
      >
        {!!confirmation && (
          <Txt muted size={12}>
            Fullfør innloggingen med e-postadressen din. En ny konto må
            bekreftes via e-post.
          </Txt>
        )}
        <Button title="Kom i gang" onPress={() => open("register")} />
        <Pressable
          accessibilityRole="button"
          onPress={() => open("login")}
          style={{
            minHeight: 42,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Txt weight="700" style={{ color: c.accent }}>
            Logg inn
          </Txt>
        </Pressable>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-evenly",
            gap: 12,
          }}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              useAppStore.getState().preferences({ onboarded: true });
              router.push("/map");
            }}
            style={{
              minHeight: 40,
              flexDirection: "row",
              alignItems: "center",
              gap: 7,
            }}
          >
            <Icon name="map" size={17} color={c.muted} />
            <Txt muted size={12}>
              Utforsk kartet
            </Txt>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              useAppStore.getState().preferences({ onboarded: true });
              useAppStore.getState().mode("simulation");
              router.push("/track");
            }}
            style={{
              minHeight: 40,
              flexDirection: "row",
              alignItems: "center",
              gap: 7,
            }}
          >
            <Icon name="play" size={16} color={c.muted} />
            <Txt muted size={12}>
              Prøv uten GPS
            </Txt>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
function WelcomeArt({ variant, height }: { variant: number; height: number }) {
  return (
    <View
      accessibilityLabel="VYRO-illustrasjon"
      style={{
        width: "100%",
        height,
        borderRadius: 28,
        overflow: "hidden",
        backgroundColor: "#E6EDD9",
      }}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 360 280"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <Rect
          width={360}
          height={280}
          fill={variant === 2 ? "#E8E1F7" : "#DFE8D4"}
        />
        <Path
          d="M-50 190Q90 24 205 75T410 25V310H-50Z"
          fill={variant === 2 ? "#D2C7EB" : "#C1D1AC"}
        />
        <Path
          d="M-20 268Q170 34 395 215V310H-20Z"
          fill={variant === 2 ? "#B7A4DD" : "#9BB782"}
        />
        <Path
          d="M-15 170Q82 45 168 119T389 98M-15 190Q80 64 163 139T389 118M-15 211Q81 83 159 159T389 139M-15 232Q80 102 156 180T389 162"
          stroke="#FFFFFF"
          strokeOpacity={0.5}
          strokeWidth={1.4}
          fill="none"
        />
        <Path
          d="M98-20Q200 60 117 148T148 310"
          stroke="#E2F0ED"
          strokeWidth={32}
          fill="none"
        />
        <Path
          d="M98-20Q200 60 117 148T148 310"
          stroke="#9DC9D0"
          strokeWidth={21}
          fill="none"
        />
        <Path
          d="M-20 238Q58 195 94 210T165 176Q194 140 241 150T350 56"
          stroke="#FFFFFF"
          strokeWidth={11}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M-20 238Q58 195 94 210T165 176Q194 140 241 150T350 56"
          stroke="#356618"
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
        />
        <Circle
          cx={94}
          cy={210}
          r={9}
          fill="#356618"
          stroke="#fff"
          strokeWidth={4}
        />
        <Circle
          cx={297}
          cy={129}
          r={15}
          fill="#B2FF78"
          stroke="#fff"
          strokeWidth={4}
        />
        <Path
          d="m290 129 5 5 9-11"
          stroke="#11182C"
          strokeWidth={2.5}
          fill="none"
        />
      </Svg>
      {variant === 1 && (
        <View
          style={{
            position: "absolute",
            top: "15%",
            left: "32%",
            width: 110,
            height: 110,
            backgroundColor: "#fff",
            borderRadius: 32,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ rotate: "-8deg" }],
            boxShadow: "0 12px 30px #11182C26",
          }}
        >
          <BrandMark size={82} />
        </View>
      )}
      {variant === 2 && (
        <View
          style={{
            position: "absolute",
            top: "18%",
            left: "17%",
            flexDirection: "row",
          }}
        >
          {["#11182C", "#B2FF78", "#FF8D79"].map((color, i) => (
            <View
              key={color}
              style={{
                width: 78,
                height: 78,
                borderRadius: 39,
                borderWidth: 4,
                borderColor: "#fff",
                backgroundColor: color,
                marginLeft: i ? -10 : 0,
                alignItems: "center",
                justifyContent: "center",
                marginTop: i === 1 ? 20 : 0,
              }}
            >
              <Icon
                name={i === 1 ? "run" : "user"}
                size={36}
                color={i === 0 ? "#fff" : "#11182C"}
              />
            </View>
          ))}
        </View>
      )}
      {variant === 0 && (
        <View
          style={{
            position: "absolute",
            top: 18,
            left: 18,
            backgroundColor: "#fff",
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 18,
            flexDirection: "row",
            gap: 8,
            alignItems: "center",
          }}
        >
          <Icon name="map" color="#356618" size={20} />
          <Txt size={13} weight="700" style={{ color: "#11182C" }}>
            En ny vei hjem.
          </Txt>
        </View>
      )}
    </View>
  );
}
