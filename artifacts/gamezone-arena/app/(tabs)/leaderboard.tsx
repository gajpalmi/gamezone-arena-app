import { Feather } from '@/components/Feather';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, SectionHeader } from '@/components/Screen';
import colors from '@/constants/colors';

export default function LeaderboardScreen() {
  return <Screen><View style={styles.header}><View><Text style={styles.eyebrow}>THE ARENA BOARD</Text><Text style={styles.title}>Leaderboard</Text></View><View style={styles.trophy}><Feather name="award" size={20} color={colors.light.accent} /></View></View><View style={styles.podium}><View style={[styles.podiumGlow, { backgroundColor: colors.light.accent + '22' }]} /><Text style={styles.podiumEyebrow}>RANKINGS</Text><Text style={styles.podiumTitle}>Leaderboard unavailable</Text><Text style={styles.podiumBody}>Ranking data is not available yet. Your game progress is not shown on this screen.</Text></View><SectionHeader title="Top players" /><View style={styles.empty}><Feather name="bar-chart-2" size={24} color={colors.light.mutedForeground} /><Text style={styles.emptyTitle}>No rankings to show</Text><Text style={styles.emptyText}>Player rankings will appear here when leaderboard data is available.</Text></View></Screen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  eyebrow: { color: colors.light.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  title: { color: colors.light.foreground, fontSize: 30, fontWeight: '800', marginTop: 7 },
  trophy: { width: 45, height: 45, borderRadius: 15, backgroundColor: colors.light.accent + '20', borderWidth: 1, borderColor: colors.light.accent + '65', alignItems: 'center', justifyContent: 'center' },
  podium: { minHeight: 164, backgroundColor: colors.light.card, borderRadius: 23, borderWidth: 1, borderColor: colors.light.border, padding: 20, overflow: 'hidden' },
  podiumGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -30, top: -75 },
  podiumEyebrow: { color: colors.light.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  podiumTitle: { color: colors.light.foreground, fontSize: 23, fontWeight: '800', marginTop: 10 },
  podiumBody: { color: colors.light.mutedForeground, fontSize: 12, lineHeight: 18, maxWidth: 230, marginTop: 5 },
  empty: { minHeight: 140, borderRadius: 19, backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyTitle: { color: colors.light.foreground, fontSize: 14, fontWeight: '800', marginTop: 10 },
  emptyText: { color: colors.light.mutedForeground, fontSize: 12, textAlign: 'center', marginTop: 5 },
});