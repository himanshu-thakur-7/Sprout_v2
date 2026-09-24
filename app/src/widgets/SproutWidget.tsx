import { Gauge, HStack, Image, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  aspectRatio, containerBackground, font, foregroundStyle, frame, gaugeStyle, kerning, lineLimit, padding, resizable, strikethrough, tint, widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { SFSymbol } from 'sf-symbols-typescript';

// 23 Home screen widgets. The small one shows the badge and Pip's mood; the
// medium one adds today's due habits with their state rings.
// Everything the widget draws arrives through props: the widget runtime
// can't see app state or anything declared outside this function.

export type WidgetRow = { name: string; symbol: SFSymbol; base: string; tint: string; progress: number; done: boolean };

export type SproutWidgetProps = {
  label: string;
  done: number;
  total: number;
  evening: boolean;
  /** file:// path of Pip's current mood image in the shared widgets directory. */
  pip: string | null;
  bubble: string | null;
  rows: WidgetRow[];
};

const SproutWidgetView = (props: SproutWidgetProps, env: WidgetEnvironment) => {
  'widget';
  const INK = '#1F2A24', SEC = '#6B6F66', GREEN = '#58C27D';
  const cream = props.evening ? '#E9E7E4' : '#FBF7F0';
  const labelC = props.evening ? '#4D5F74' : '#2F6B45';
  const dark = env.colorScheme === 'dark';
  const bg = dark ? '#131915' : cream;
  const ink = dark ? '#F2EEE6' : INK;
  const all = props.total > 0 && props.done === props.total;

  const badge = (
    <HStack spacing={8}>
      <Text modifiers={[font({ size: 34, weight: 'black', design: 'rounded' }), kerning(-1), foregroundStyle(ink)]}>
        {props.total ? `${props.done}/${props.total}` : '—'}
      </Text>
      {all
        ? <Image systemName="checkmark.circle.fill" size={22} color={GREEN} />
        : (
          <Gauge value={props.total ? props.done / props.total : 0} modifiers={[gaugeStyle('circularCapacity'), tint(GREEN), frame({ width: 24, height: 24 })]} />
        )}
    </HStack>
  );

  const pip = props.pip
    ? <Image uiImage={props.pip} modifiers={[resizable(), aspectRatio({ contentMode: 'fit' }), frame({ width: 78, height: 92 })]} />
    : null;

  const label = (
    <Text modifiers={[font({ size: 11, weight: 'heavy', design: 'rounded' }), kerning(0.5), foregroundStyle(dark ? '#7FD49C' : labelC)]}>{props.label}</Text>
  );

  if (env.widgetFamily === 'systemMedium') {
    return (
      <HStack spacing={4} modifiers={[containerBackground(bg, 'widget'), widgetURL('sprout://')]}>
        <ZStack alignment="bottomLeading" modifiers={[frame({ width: 136, maxHeight: 9999, alignment: 'topLeading' })]}>
          <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: 9999, maxHeight: 9999, alignment: 'topLeading' })]}>
            {label}
            {badge}
          </VStack>
          <HStack modifiers={[padding({ leading: 20 })]}>{pip}</HStack>
        </ZStack>
        <VStack alignment="leading" spacing={6} modifiers={[frame({ maxWidth: 9999 })]}>
          {props.rows.slice(0, 4).map(r => (
            <HStack key={r.name} spacing={8}>
              <Image systemName={r.symbol} size={13} color={r.base} modifiers={[frame({ width: 26, height: 26 })]} />
              <Text modifiers={[
                font({ size: 14, weight: 'heavy', design: 'rounded' }), lineLimit(1),
                foregroundStyle(r.done ? SEC : ink), strikethrough({ isActive: r.done, pattern: 'solid', color: '#B5B1A8' }),
              ]}>{r.name}</Text>
              <Spacer />
              {r.done
                ? <Image systemName="checkmark.circle.fill" size={20} color={GREEN} />
                : <Gauge value={r.progress} modifiers={[gaugeStyle('circularCapacity'), tint(r.base), frame({ width: 22, height: 22 })]} />}
            </HStack>
          ))}
          {props.rows.length === 0 ? <Text modifiers={[font({ size: 13, weight: 'bold', design: 'rounded' }), foregroundStyle(SEC)]}>Rest day. Enjoy it.</Text> : null}
        </VStack>
      </HStack>
    );
  }

  return (
    <ZStack alignment="bottomTrailing" modifiers={[containerBackground(bg, 'widget'), widgetURL('sprout://')]}>
      <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: 9999, maxHeight: 9999, alignment: 'topLeading' })]}>
        {label}
        {badge}
        {props.bubble
          ? <Text modifiers={[font({ size: 12, weight: 'bold', design: 'rounded' }), foregroundStyle(dark ? '#A3A89E' : labelC), lineLimit(2), frame({ maxWidth: 90, alignment: 'leading' })]}>{props.bubble}</Text>
          : null}
      </VStack>
      {pip}
    </ZStack>
  );
};

export default createWidget<SproutWidgetProps>('SproutWidget', SproutWidgetView);
