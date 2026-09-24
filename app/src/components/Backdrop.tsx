import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Rect, Stop } from 'react-native-svg';

/** The soft hill Pip stands on: a wide ellipse bleeding 100px past each side. */
export function Hill({ top, color, height = 480, bleed = 100 }: { top: number; color: string; height?: number; bleed?: number }) {
  const { width } = useWindowDimensions();
  const w = width + bleed * 2;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: -bleed, top, width: w, height }}>
      <Svg width={w} height={height}>
        <Ellipse cx={w / 2} cy={height / 2} rx={w / 2} ry={height / 2} fill={color} />
      </Svg>
    </View>
  );
}

/** Full-bleed vertical gradient (dusk, golden wash). Stops are [offset 0–1, colour]. */
export function Gradient({ stops, id }: { stops: [number, string][]; id: string }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          {stops.map(([o, c]) => <Stop key={o} offset={o} stopColor={c} />)}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
