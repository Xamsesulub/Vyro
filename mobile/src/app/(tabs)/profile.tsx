import { Switch, TextInput, View } from "react-native";
import { router } from "expo-router";
import { ActivityCard } from "../../components/ActivityCard";
import {
  Badge,
  Button,
  Card,
  Chip,
  Header,
  Icon,
  Metric,
  Screen,
  Section,
  Txt,
  styles,
  useTheme,
} from "../../components/ui";
import { useAppStore } from "../../stores/useAppStore";
import { examples } from "../../features/activities/examples";
import { km, sports, total } from "../../features/activities/model";
import { brand } from "../../theme/tokens";
export default function Profile() {
  const s = useAppStore();
  const c = useTheme();
  const list = s.examplesVisible ? [...s.workouts, ...examples] : s.workouts;
  const stats = total(s.workouts);
  return (
    <Screen>
      <Header eyebrow="Din reise, dine premisser" title="Min profil" />
      <Card>
        <View style={styles.row}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: brand.lavender,
            }}
          >
            <Txt size={30} weight="700" style={{ color: brand.navy }}>
              {s.name.charAt(0).toUpperCase() || "V"}
            </Txt>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Txt size={24} weight="700">
              {s.name || "Din VYRO"}
            </Txt>
            <Badge text="Lokal profil · privat" />
          </View>
        </View>
        <View style={styles.row}>
          <Metric value={km(stats.distance)} label="simulerte kilometer" />
          <Metric
            value={String(s.workouts.length)}
            label="lagrede simuleringer"
          />
        </View>
      </Card>
      <Section title="Gjør det personlig" />
      <Card>
        <Txt size={13} muted>
          Fornavn
        </Txt>
        <TextInput
          accessibilityLabel="Endre fornavn"
          value={s.name}
          onChangeText={(name) => s.preferences({ name })}
          maxLength={30}
          placeholder="Ditt fornavn"
          placeholderTextColor={c.muted}
          style={{
            color: c.text,
            borderBottomWidth: 1,
            borderColor: c.border,
            paddingVertical: 12,
            fontSize: 18,
          }}
        />
        <Txt size={13} muted>
          Foretrukne aktiviteter
        </Txt>
        <View style={styles.wrap}>
          {sports.map((v) => (
            <Chip
              key={v}
              title={v}
              selected={s.preferred.includes(v)}
              onPress={() =>
                s.preferences({
                  preferred: s.preferred.includes(v)
                    ? s.preferred.filter((x) => x !== v)
                    : [...s.preferred, v],
                })
              }
            />
          ))}
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Txt>Mørkt utseende</Txt>
            <Txt size={12} muted>
              VYRO i din stil
            </Txt>
          </View>
          <Switch
            accessibilityLabel="Mørkt utseende"
            value={s.theme === "dark"}
            onValueChange={(dark) =>
              s.preferences({ theme: dark ? "dark" : "light" })
            }
            trackColor={{ true: "#567C44", false: "#B5BECD" }}
            thumbColor={s.theme === "dark" ? brand.lime : "#FFFFFF"}
          />
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Txt>Vis eksempeløkter</Txt>
            <Txt size={12} muted>
              Gjelder hjem, fremgang og historikk
            </Txt>
          </View>
          <Switch
            accessibilityLabel="Vis eksempeløkter"
            value={s.examplesVisible}
            onValueChange={(value) => s.preferences({ examplesVisible: value })}
            trackColor={{ true: "#567C44", false: "#B5BECD" }}
          />
        </View>
      </Card>
      <Card>
        <View style={styles.row}>
          <Icon name="lock" />
          <Txt weight="600" style={{ flex: 1 }}>
            Bare på denne enheten
          </Txt>
        </View>
        <Txt muted size={14}>
          Ingen konto er opprettet. Prototypen sender ikke øktene dine til
          Supabase. Kontoinnstillinger, eksport og sletting av konto kommer med
          innlogging.
        </Txt>
        <Button
          title="Se introduksjonen igjen"
          secondary
          onPress={() => router.push("/onboarding")}
        />
      </Card>
      <Section title="Aktivitetshistorikk" />
      {list.length ? (
        list.map((w) => <ActivityCard key={w.id} workout={w} />)
      ) : (
        <Card>
          <Txt weight="600">Her kommer dine første steg.</Txt>
          <Txt muted>Start en simulert økt fra Tren-fanen.</Txt>
        </Card>
      )}
      <Txt size={11} muted style={{ textAlign: "center", letterSpacing: 2 }}>
        VYRO 0.1 · MOVE BEYOND
      </Txt>
    </Screen>
  );
}
