import Svg, { Circle, Path, Rect, Text as SvgText } from "react-native-svg";
import { useAppStore } from "../stores/useAppStore";
export function RouteArt({ height = 210 }: { height?: number }) {
  const light = useAppStore((s) => s.theme) === "light";
  return (
    <Svg
      width="100%"
      height={height}
      viewBox="0 0 360 270"
      preserveAspectRatio="xMidYMid slice"
      accessibilityLabel="Illustrert eksempelrute, ikke et navigasjonskart"
    >
      <Rect width={360} height={270} fill={light ? "#E8EEE2" : "#172237"} />
      <Path
        d="M-20 80Q90 20 130 95T380 100M-20 190 390 160M70-20 120 290M270-20 210 290M-20 240 390 220M-10 22 390 50"
        stroke={light ? "#FFFFFF" : "#26354B"}
        strokeWidth={22}
        fill="none"
      />
      <Path
        d="M190-20Q270 70 189 132T190 290"
        stroke={light ? "#B7D9E9" : "#34546A"}
        strokeWidth={14}
        fill="none"
      />
      <Path
        d="M195 250Q230 206 196 181T205 125 237 74 219 25"
        stroke={light ? "#356618" : "#B2FF78"}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      <Circle
        cx={195}
        cy={250}
        r={7}
        fill={light ? "#FFFFFF" : "#11182C"}
        stroke={light ? "#356618" : "#B2FF78"}
        strokeWidth={3}
      />
      <Circle cx={219} cy={25} r={11} fill="#B2FF78" fillOpacity={0.2} />
      <Circle cx={219} cy={25} r={5} fill="#B2FF78" />
      <SvgText x={30} y={120} fill="#768AA0" fontSize={10} letterSpacing={2}>
        OSLO
      </SvgText>
      <SvgText x={250} y={205} fill="#768AA0" fontSize={9}>
        AKERSELVA
      </SvgText>
    </Svg>
  );
}
