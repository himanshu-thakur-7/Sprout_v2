import { Fragment, useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { PIP } from '@/theme/colors';
import { springEase } from '@/theme/motion';

// Pip — a soft jellybean seed. Moods only swap or transform parts (eyes, mouth,
// leaf rotation, arm pose, body offset); the character is never redrawn.
// 200 × 240 artboard, leaves pivot at the stem tip (100, 46). Ported from Pip.dc.html.

export type PipMood = 'expectant' | 'happy' | 'cheering' | 'proud' | 'sleepy' | 'droopy' | 'relieved' | 'waving';
export type PipProp = 'none' | 'book' | 'dumbbells' | 'meditate' | 'sneakers' | 'trophy' | 'bell';
export type PipPart = 'body' | 'leaves' | 'eyes' | 'blush' | 'mouth' | 'arms' | 'feet' | 'prop';

type Eyes = 'up' | 'open' | 'closed' | 'half' | 'happy' | 'down' | 'sad';
type Pose = {
  eyes: Eyes; mouth: 'smile' | 'grin' | 'open' | 'frown' | 'tiny' | 'wobble'; leaves: 'up' | 'perky' | 'tilt' | 'wilt';
  arms: keyof typeof ARMS; by: number; sy?: number; zz?: boolean; legs?: 'walk' | 'cross';
};

const MOODS: Record<PipMood, Pose> = {
  expectant: { eyes: 'up', mouth: 'smile', leaves: 'up', arms: 'down', by: 0 },
  happy: { eyes: 'open', mouth: 'grin', leaves: 'perky', arms: 'out', by: -8 },
  cheering: { eyes: 'open', mouth: 'open', leaves: 'perky', arms: 'up', by: -12 },
  proud: { eyes: 'open', mouth: 'grin', leaves: 'up', arms: 'front', by: 0 },
  sleepy: { eyes: 'closed', mouth: 'tiny', leaves: 'tilt', arms: 'down', by: 2, zz: true },
  // Sad, never cross: lids droop at the outer corners, a small wobbly mouth.
  droopy: { eyes: 'sad', mouth: 'wobble', leaves: 'wilt', arms: 'slump', by: 4, sy: 0.96 },
  relieved: { eyes: 'happy', mouth: 'grin', leaves: 'perky', arms: 'out', by: -4 },
  waving: { eyes: 'open', mouth: 'grin', leaves: 'up', arms: 'wave', by: 0 },
};

const PROPS: Record<Exclude<PipProp, 'none'>, Partial<Pose>> = {
  book: { arms: 'front', eyes: 'down', by: 0 },
  dumbbells: { arms: 'up' },
  meditate: { arms: 'lap', eyes: 'closed', mouth: 'smile', legs: 'cross', by: 0, leaves: 'up' },
  sneakers: { arms: 'swing', legs: 'walk', by: 0 },
  trophy: { arms: 'front' },
  bell: { arms: 'front', by: 0 },
};

type ArmSpec = [cx: number, cy: number, rot: number, rx?: number, ry?: number];
const ARMS = {
  down: [[46, 152, 22], [154, 152, -22]],
  out: [[41, 146, 40], [159, 146, -40]],
  slump: [[49, 160, 10], [151, 160, -10]],
  up: [[37, 100, -32], [163, 100, 32]],
  wave: [[46, 152, 22], [158, 104, 28]],
  front: [[52, 160, 38, 9, 13], [148, 160, -38, 9, 13]],
  lap: [[80, 183, -62, 9, 14], [120, 183, 62, 9, 14]],
  swing: [[47, 150, 32], [153, 150, -6]],
} satisfies Record<string, ArmSpec[]>;

const LEAF_TILT = { up: [0, 0], perky: [-8, 8], tilt: [-38, 38], wilt: [-35, 35] } as const;

type Props = {
  mood?: PipMood;
  prop?: PipProp;
  size?: number;
  shadow?: boolean;
  /** Render a single part on its own (the Rive parts sheet). */
  only?: PipPart;
  /** Idle breathe + blinks. On by default. */
  alive?: boolean;
  /** 0–1: how much of the day is done. Pip's posture lifts as it fills. */
  lift?: number;
};

export function Pip({ mood = 'expectant', prop = 'none', size = 160, shadow = true, only, alive = true, lift = 0 }: Props) {
  const effProp: PipProp = mood === 'proud' && prop === 'none' ? 'trophy' : prop;
  const c: Pose = { ...MOODS[mood], ...(effProp !== 'none' ? PROPS[effProp] : {}) };
  const k = size / 200;
  const blinking = useBlink(alive && !only && (c.eyes === 'open' || c.eyes === 'up'));
  const eyes: Eyes = blinking ? 'closed' : c.eyes;

  // Body offset springs between moods (400 ms); idle breathe is a gentle 2px loop.
  const by = useSharedValue(c.by);
  const breathe = useSharedValue(0);
  const target = c.by - 5 * Math.max(0, Math.min(1, lift));
  useEffect(() => {
    by.value = withTiming(target, { duration: 400, easing: springEase });
  }, [target, by]);
  useEffect(() => {
    if (!alive || only) return;
    breathe.value = withRepeat(withSequence(
      withTiming(-2, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
    ), -1);
    return () => cancelAnimation(breathe);
  }, [alive, only, breathe]);
  const bodyStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (by.value + breathe.value) * k }] }));

  // Leaves sway ±3° around the stem tip while idle.
  const sway = useSharedValue(0);
  useEffect(() => {
    if (!alive || only) return;
    sway.value = withRepeat(withSequence(
      withTiming(3, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      withTiming(-3, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
    return () => cancelAnimation(sway);
  }, [alive, only, sway]);
  const swayStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${sway.value}deg` }] }));

  const show = (id: PipPart) => !only || only === id;
  const part = (id: PipPart, ...kids: ReactNode[]) =>
    show(id) ? <G>{kids.map((el, i) => <Fragment key={i}>{el}</Fragment>)}</G> : null;

  const E = (cx: number, cy: number, rx: number, ry: number, fill: string, rot = 0, opacity?: number) => (
    <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} opacity={opacity} transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined} />
  );
  const S = (d: string, w = 3.4, col = PIP.eyes) => (
    <Path d={d} fill="none" stroke={col} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
  );
  const hand = (cx: number, cy: number) => <Circle cx={cx} cy={cy} r={9.5} fill={PIP.arm} />;

  const sneaker = (x: number, y: number, r: number) => (
    <G transform={`translate(${x} ${y}) rotate(${r})`}>
      {E(0, -9, 8, 9, PIP.foot)}
      <Path d="M-14 4C-14 -4 -9 -8 -3 -8C1 -8 3 -5 7 -3C12 -1 16 0 16 4V5H-14Z" fill="#2EC4B6" />
      <Rect x={-15} y={3.5} width={32} height={5.5} rx={2.75} fill="#FFFFFF" />
      <Path d="M-3 -6L0 -2M2 -7L5 -3" fill="none" stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" />
    </G>
  );

  let feet: ReactNode = null, legs: ReactNode = null;
  if (c.legs === 'walk') feet = part('feet', sneaker(80, 213, -6), sneaker(124, 207, 8));
  else if (c.legs === 'cross') legs = part('feet', E(80, 204, 38, 15, PIP.foot, 8), E(120, 206, 38, 15, PIP.arm, -8));
  else feet = part('feet', E(80, 210, 15, 10, PIP.foot), E(120, 210, 15, 10, PIP.foot));

  const body = part('body',
    <Path d="M100 58C139 58 156 90 158 132C160 178 148 210 100 210C52 210 40 178 42 132C44 90 61 58 100 58Z" fill={PIP.body} />,
    <Path d="M43 158C45 192 62 210 100 210C138 210 155 192 157 158C146 186 124 194 100 194C76 194 54 186 43 158Z" fill={PIP.shade} />,
  );

  const lt = LEAF_TILT[c.leaves];
  const leaves = part('leaves',
    S(c.leaves === 'wilt' ? 'M100 60Q99 53 100 47' : 'M100 60V46', 5, PIP.stem),
    <Path d="M100 46C94 30 78 25 67 30C70 42 86 50 100 46Z" fill={PIP.leaf} transform={`rotate(${lt[0]} 100 46)`} />,
    <Path d="M100 46C106 30 122 25 133 30C130 42 114 50 100 46Z" fill={PIP.leaf} transform={`rotate(${lt[1]} 100 46)`} />,
  );

  const eye = (cx: number) => {
    if (eyes === 'closed') return S(`M${cx - 10} 110Q${cx} 118 ${cx + 10} 110`, 3.6);
    if (eyes === 'happy') return S(`M${cx - 10} 114Q${cx} 102 ${cx + 10} 114`, 3.6);
    if (eyes === 'sad') {
      // Lid slopes down toward the outside of the face.
      const outer = cx < 100 ? cx - 12 : cx + 12, inner = cx < 100 ? cx + 12 : cx - 12;
      return (
        <G>
          <Circle cx={cx} cy={111} r={9.5} fill={PIP.eyes} />
          <Path d={`M${outer} 96L${inner} 96L${inner} 104L${outer} 110Z`} fill={PIP.body} />
          <Path d={`M${outer} 110L${inner} 104`} stroke={PIP.eyes} strokeWidth={3} strokeLinecap="round" />
          <Circle cx={cx + (cx < 100 ? -2.5 : 2.5)} cy={115} r={2.2} fill="#fff" />
        </G>
      );
    }
    if (eyes === 'half') return (
      <G>
        <Path d={`M${cx - 10} 110A10 10 0 0 0 ${cx + 10} 110Z`} fill={PIP.eyes} />
        <Path d={`M${cx - 11.5} 109.5H${cx + 11.5}`} stroke={PIP.eyes} strokeWidth={3.2} strokeLinecap="round" />
        <Circle cx={cx + 3} cy={114} r={2.2} fill="#fff" />
      </G>
    );
    const dy = eyes === 'up' ? -3 : eyes === 'down' ? 3 : 0;
    return (
      <G>
        <Circle cx={cx} cy={110 + dy} r={10.5} fill={PIP.eyes} />
        <Circle cx={cx + 3.6} cy={106 + dy} r={3.6} fill="#fff" />
        <Circle cx={cx - 3.5} cy={114 + dy} r={1.5} fill="#fff" opacity={0.7} />
      </G>
    );
  };
  const eyesPart = part('eyes', eye(80), eye(120));
  const blush = part('blush', E(63, 126, 9.5, 6, PIP.blush, 0, 0.8), E(137, 126, 9.5, 6, PIP.blush, 0, 0.8));

  const MO: Record<Pose['mouth'], ReactElement> = {
    smile: S('M93 127Q100 133.5 107 127', 3.4),
    grin: S('M89 125Q100 139 111 125', 3.6),
    open: <><Path d="M88 124Q100 127 112 124Q111 143 100 143Q89 143 88 124Z" fill={PIP.eyes} />{E(100, 137.5, 6.5, 4, '#F08C86')}</>,
    frown: S('M93 134Q100 128 107 134', 3.2),
    tiny: S('M96 130Q100 132.5 104 130', 3),
    wobble: S('M92 132Q96 128.5 100 131Q104 133.5 108 130', 3.2),
  };
  const mouth = part('mouth', MO[c.mouth]);

  const arms = part('arms', ...(ARMS[c.arms] as ArmSpec[]).map(([cx, cy, rot, rx = 10, ry = 16]) => E(cx, cy, rx, ry, PIP.arm, rot)));

  let pr: ReactNode = null, hands: ReactNode = null;
  if (effProp === 'book') {
    pr = part('prop',
      <Path d="M100 160C90 154 78 153 66 156V188C78 185 90 186 100 192Z" fill="#FFC83D" />,
      <Path d="M100 160C110 154 122 153 134 156V188C122 185 110 186 100 192Z" fill="#FFD466" />,
      S('M100 160V192', 2.4, '#E0AC22'),
    );
    hands = part('arms', hand(66, 176), hand(134, 176));
  }
  if (effProp === 'trophy') {
    pr = part('prop',
      S('M83 150C71 150 71 166 85 166M117 150C129 150 129 166 115 166', 4, '#E0AC22'),
      <Path d="M82 145H118V156C118 170 110 177 100 177C90 177 82 170 82 156Z" fill="#FFC83D" />,
      <Rect x={95.5} y={176} width={9} height={8} fill="#E0AC22" />,
      <Rect x={85} y={183} width={30} height={8} rx={3} fill="#FFC83D" />,
      <Path d="M100 151L102.4 156L107.6 156.6L103.8 160L104.8 165.2L100 162.6L95.2 165.2L96.2 160L92.4 156.6L97.6 156Z" fill="#FFF1B8" />,
    );
    hands = part('arms', hand(83, 186), hand(117, 186));
  }
  if (effProp === 'bell') {
    pr = part('prop',
      <Circle cx={100} cy={139} r={4} fill="#E0AC22" />,
      <Path d="M100 141C90 141 84 149 84 159V168L79 175H121L116 168V159C116 149 110 141 100 141Z" fill="#FFC83D" />,
      <Circle cx={100} cy={180} r={5} fill="#E0AC22" />,
    );
    hands = part('arms', hand(80, 170), hand(120, 170));
  }
  if (effProp === 'dumbbells') {
    const db = (x: number, y: number) => (
      <G transform={`translate(${x} ${y})`}>
        <Rect x={-14} y={-2.5} width={28} height={5} rx={2.5} fill="#E0822A" />
        <Rect x={-19} y={-11} width={9} height={22} rx={3.5} fill="#FF9F43" />
        <Rect x={10} y={-11} width={9} height={22} rx={3.5} fill="#FF9F43" />
        <Circle cx={0} cy={0} r={8} fill={PIP.arm} />
      </G>
    );
    pr = part('prop', db(29, 86), db(171, 86));
  }

  const zz = c.zz && !only ? (
    <G fill="#8A9A90">
      <SvgText x={146} y={58} fontSize={20} fontFamily="Nunito_900Black">z</SvgText>
      <SvgText x={162} y={40} fontSize={15} fontFamily="Nunito_900Black">z</SvgText>
    </G>
  ) : null;

  const squash = c.sy ? `translate(100 210) scale(1 ${c.sy}) translate(-100 -210)` : undefined;
  const h = size * 1.2;
  // Stem tip (100, 46) after the droopy squash, in points: the leaves' pivot.
  const tipY = (c.sy ? 210 - (210 - 46) * c.sy : 46) * k;

  return (
    <View style={{ width: size, height: h }} pointerEvents="none">
      {shadow && !only ? (
        <Svg viewBox="0 0 200 240" width={size} height={h} style={{ position: 'absolute' }}>
          <Ellipse cx={100} cy={226} rx={c.by < -4 ? 46 : 58} ry={7} fill="rgba(31,42,36,0.09)" />
        </Svg>
      ) : null}
      <Animated.View style={[{ position: 'absolute', width: size, height: h }, bodyStyle]}>
        <Svg viewBox="0 0 200 240" width={size} height={h} style={{ overflow: 'visible' }}>
          <G transform={squash}>
            {feet}{body}{legs}{eyesPart}{blush}{mouth}{arms}{pr}{hands}{zz}
          </G>
        </Svg>
        {leaves ? (
          <Animated.View style={[{ position: 'absolute', width: size, height: h, transformOrigin: [100 * k, tipY, 0] }, swayStyle]}>
            <Svg viewBox="0 0 200 240" width={size} height={h} style={{ overflow: 'visible' }}>
              <G transform={squash}>{leaves}</G>
            </Svg>
          </Animated.View>
        ) : null}
      </Animated.View>
    </View>
  );
}

/** Blinks every 4–6 s while enabled. */
function useBlink(enabled: boolean) {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setClosed(true);
        t = setTimeout(() => { setClosed(false); loop(); }, 140);
      }, 4000 + Math.random() * 2000);
    };
    loop();
    return () => clearTimeout(t);
  }, [enabled]);
  return enabled && closed;
}
