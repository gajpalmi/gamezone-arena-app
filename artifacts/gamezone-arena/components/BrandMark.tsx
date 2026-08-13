import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import colors from '@/constants/colors';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.row}>
      <LinearGradient
        colors={[colors.light.primary, colors.light.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.mark, compact && styles.markCompact]}
      >
        <Feather name="crosshair" size={compact ? 18 : 25} color={colors.light.primaryForeground} />
      </LinearGradient>
      {!compact && (
        <View>
          <Text style={styles.title}>GAMEZONE</Text>
          <Text style={styles.subtitle}>ARENA</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  mark: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  markCompact: { width: 38, height: 38, borderRadius: 13 },
  title: { color: colors.light.foreground, fontSize: 18, fontWeight: '800', letterSpacing: 1.8 },
  subtitle: { color: colors.light.primary, fontSize: 11, fontWeight: '700', letterSpacing: 3.4, marginTop: 2 },
});