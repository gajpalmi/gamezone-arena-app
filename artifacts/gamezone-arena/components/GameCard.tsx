import { Feather } from '@/components/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import colors from '@/constants/colors';
import { Game } from '@/constants/config';

export function GameCard({ game, onPress, wide = false, available = true }: { game: Game; onPress?: () => void; wide?: boolean; available?: boolean }) {
  return (
    <Pressable disabled={!available} onPress={onPress} style={({ pressed }) => [styles.card, wide && styles.wide, !available && styles.unavailable, pressed && styles.pressed]}>
      <LinearGradient colors={[game.color + '58', colors.light.card, '#14203F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.icon, { backgroundColor: game.color + '25', borderColor: game.color + '70' }]}>
        <Feather name={game.icon} size={22} color={game.color} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.category}>{game.category.toUpperCase()}</Text>
        <Text style={styles.title}>{game.title}</Text>
        <Text numberOfLines={2} style={styles.description}>{game.description}</Text>
        <View style={styles.meta}><Text style={styles.difficulty}>{game.difficulty}</Text><Text style={[styles.reward, { color: game.color }]}>{game.reward}</Text></View>
      </View>
      <View style={[styles.play, !available && styles.locked]}><Feather name={available ? 'play' : 'lock'} size={15} color={available ? colors.light.primaryForeground : colors.light.mutedForeground} /></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 184, width: 265, borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: colors.light.border, padding: 18, justifyContent: 'space-between' },
  wide: { width: '100%', minHeight: 132, flexDirection: 'row', alignItems: 'center', gap: 14 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  unavailable: { opacity: 0.72 },
  icon: { width: 50, height: 50, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  category: { color: colors.light.mutedForeground, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 10 },
  title: { color: colors.light.foreground, fontSize: 20, fontWeight: '900', marginTop: 4 },
  description: { color: colors.light.secondaryForeground, fontSize: 13, lineHeight: 19, marginTop: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  difficulty: { color: colors.light.secondaryForeground, fontSize: 11, fontWeight: '600' },
  reward: { fontSize: 11, fontWeight: '800' },
  play: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.light.primary, alignItems: 'center', justifyContent: 'center', position: 'absolute', right: 16, bottom: 16 },
  locked: { backgroundColor: colors.light.muted },
});