import Svg, { Path } from "react-native-svg";
import mark from "../theme/runnerMark.json";

/** Shared vector artwork redrawn from the owner's VYRO reference. */
export function BrandMark({
  size = 32,
  color = mark.navy,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox={mark.viewBox} aria-hidden>
      <Path d={mark.path} fill={color} />
      <Path d={mark.swoosh} fill={mark.lime} />
    </Svg>
  );
}
export function BrandWordmark({
  width = 240,
  color = mark.navy,
}: {
  width?: number;
  color?: string;
}) {
  return (
    <Svg
      width={width}
      height={(width * 315) / 1060}
      viewBox={mark.wordmarkViewBox}
      accessibilityRole="image"
      accessibilityLabel="VYRO"
    >
      <Path d={mark.path} fill={color} />
      <Path d={mark.swoosh} fill={mark.lime} />
      <Path d={mark.letters} fill={color} fillRule="evenodd" />
    </Svg>
  );
}
