import { useState } from "react";
import { View } from "react-native";
import {
  Button,
  Icon,
  Screen,
  Section,
  Txt,
  styles,
  useTheme,
} from "../../components/ui";

import { useAppStore } from "../../stores/useAppStore";
import { brand } from "../../theme/tokens";
export default function Community() {
  const s = useAppStore();
  const c = useTheme();
  const [expanded, setExpanded] = useState(false);
  return (
    <Screen>
      <Txt size={28} weight="700">
        Fellesskap
      </Txt>
      <Txt size={13} muted>
        Forhåndsvisning · fiktive profiler og lokale valg
      </Txt>
      <View
        style={{
          gap: 14,
          paddingBottom: 24,
          borderBottomWidth: 1,
          borderColor: c.border,
        }}
      >
        <Txt size={20} weight="600">
          Helgetur
        </Txt>
        <Txt size={14} muted>
          Ta en tur ute, i ditt eget tempo.
        </Txt>{" "}
        <Button
          title={s.joined ? "Påmeldt i demo · meld av" : "Bli med i demo"}
          icon={s.joined ? "check" : "arrow"}
          secondary
          onPress={() => s.preferences({ joined: !s.joined })}
        />
        <Txt size={12} muted>
          Valget lagres kun lokalt. Ingen andre varsles.
        </Txt>
      </View>
      <Section title="Fra fellesskapet" />
      <View
        style={{
          gap: 16,
          paddingBottom: 24,
          borderBottomWidth: 1,
          borderColor: c.border,
        }}
      >
        <View style={styles.row}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: c.raised,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Txt weight="700" style={{ color: brand.lavender }}>
              AL
            </Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt weight="600">Alex · eksempelprofil</Txt>
            <Txt muted size={12}>
              En rolig søndag ute
            </Txt>
          </View>
          <Icon name="run" color={c.muted} />
        </View>
        <Txt size={20} weight="600">
          Søndagstur
        </Txt>
        <Txt muted size={14}>
          En fiktiv aktivitet som viser hvordan delte treningsøyeblikk kan se
          ut.
        </Txt>
        <Button
          title={s.liked ? "Heiet på · angre" : "Gi litt heiarop"}
          icon="heart"
          secondary
          onPress={() => s.preferences({ liked: !s.liked })}
        />
        {s.liked && (
          <Txt size={12} style={{ color: c.accent }}>
            Heiarop registrert i din lokale demo.
          </Txt>
        )}
      </View>
      <View style={{ gap: 12 }}>
        <Button
          title={expanded ? "Skjul personvern" : "Personvern og deling"}
          secondary
          onPress={() => setExpanded(!expanded)}
        />
        {expanded && (
          <Txt size={14} muted>
            Øktene dine er private. Sosial deling er ikke aktivert i denne
            forhåndsvisningen.
          </Txt>
        )}
      </View>
    </Screen>
  );
}
