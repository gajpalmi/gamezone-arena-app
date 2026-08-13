import { ReactNode } from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';

export function Screen({
  children,
  scroll = true,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const style = [styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 96 }, contentStyle];
  if (!scroll) return <View style={styles.root}><View style={style}>{children}</View></View>;
  return <ScrollView style={styles.root} contentContainerStyle={style} showsVerticalScrollIndicator={false}>{children}</ScrollView>;
}

export function SectionHeader({ title, action }: { title: string; action?: string }) {
  return <View style={styles.sectionHeader}><View><View style={styles.sectionAccent} /><View><TextLabel>{title}</TextLabel></View></View>{action ? <TextLabel muted>{action}</TextLabel> : null}</View>;
}

function TextLabel({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return <View><View><Text style={[styles.sectionTitle, muted && styles.muted]}>{children}</Text></View></View>;
}

import { Text } from 'react-native';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light.background },
  content: { paddingHorizontal: 20, gap: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionAccent: { width: 3, height: 16, backgroundColor: colors.light.primary, borderRadius: 2, position: 'absolute', left: -10, top: 2 },
  sectionTitle: { color: colors.light.foreground, fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  muted: { color: colors.light.mutedForeground, fontSize: 12, fontWeight: '600' },
});