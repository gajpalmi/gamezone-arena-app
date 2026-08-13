import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import colors from '@/constants/colors';
import { Game } from '@/constants/config';

export function GameCard({ game, onPress, wide = false }: { game: Game; onPress?: () => void; wide?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, wide && styles.wide, pressed && styles.pressed]}>
      <LinearGradient colors={[game.color + '2A', colors.light.card]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.icon, { backgroundColor: game.color + '25', borderColor: game.color + '70' }]}>
        <Feather name={game.icon} size={22} color={game.color} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.category}>{game.category.toUpperCase()}</Text>
        <Text style={styles.title}>{game.title}</Text>
        <Text numberOfLines={2} style={styles.description}>{game.description}</Text>
        <View style={styles.meta}><Text style={styles.difficulty}>{game.difficulty}</Text><Text style={[styles.reward, { color: game.color }]}>{game.reward}</Text></View>
      </View>
      <View style={styles.play}><Feather name="play" size={15} color={colors.light.primaryForeground} /></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 164, width: 245, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: colors.light.border, padding: 16, justifyContent: 'space-between' },
  wide: { width: '100%', minHeight: 132, flexDirection: 'row', alignItems: 'center', gap: 14 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  icon: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  category: { color: colors.light.mutedForeground, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 10 },
  title: { color: colors.light.foreground, fontSize: 18, fontWeight: '800', marginTop: 3 },
  description: { color: colors.light.mutedForeground, fontSize: 12, lineHeight: 18, marginTop: 5 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  difficulty: { color: colors.light.secondaryForeground, fontSize: 11, fontWeight: '600' },
  reward: { fontSize: 11, fontWeight: '800' },
  play: { width: 32, height: 32, borderRadius: 11, backgroundColor: colors.light.primary, alignItems: 'center', justifyContent: 'center', position: 'absolute', right: 15, bottom: 15 },
});