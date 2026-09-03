import React from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";

const symbols: Record<string, string> = {
  "alert-circle": "!",
  "arrow-left": "←",
  award: "★",
  check: "✓",
  "check-circle": "✓",
  "chevron-down": "⌄",
  "chevron-left": "‹",
  "chevron-right": "›",
  circle: "●",
  clock: "◷",
  crosshair: "◎",
  eye: "◉",
  "eye-off": "—",
  inbox: "▣",
  lock: "◆",
  "more-horizontal": "•••",
  play: "▶",
  "rotate-ccw": "↺",
  search: "⌕",
  trophy: "★",
  "user-plus": "+",
  x: "×",
  zap: "ϟ",
};

type FeatherProps = {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

function FeatherIcon({
  name,
  size = 20,
  color = "#FFFFFF",
  style,
}: FeatherProps) {
  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        {
          color,
          fontSize: size,
          fontWeight: "800",
          lineHeight: Math.ceil(size * 1.15),
          textAlign: "center",
        },
        style,
      ]}
    >
      {symbols[name] ?? "•"}
    </Text>
  );
}

export const Feather = Object.assign(FeatherIcon, {
  glyphMap: symbols,
});