import { Feather } from '@/components/Feather';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, SectionHeader } from '@/components/Screen';
import colors from '@/constants/colors';

const players = [
  { rank: 1, name: 'NovaByte', score: '12,840', tone: '#FFB45E', tag: '01' },
  { rank: 2, name: 'PixelPilot', score: '11,920', tone: '#C66BFF', tag: '02' },
  { rank: 3, name: 'ArcadeFox', score: '11,480', tone: '#7CF2B2', tag: '03' },
  { rank: 4, name: 'You', score: '11,360', tone: colors.light.primary, tag: '04' },
  { rank: 5, name: 'CodeRunner', score: '10,940', tone: '#FF6D8A', tag: '05' },
];

export default function LeaderboardScreen() {
  const [period, setPeriod] = useState('Global');
  return <Screen><View style={styles.header}><View><Text style={styles.eyebrow}>THE ARENA BOARD</Text><Text style={styles.title}>Leaderboard</Text></View><View style={styles.trophy}><Feather name="award" size={20} color={colors.light.accent} /></View></View><View style={styles.tabs}>{['Global', 'Weekly', 'Friends'].map((item) => <Pressable key={item} onPress={() => setPeriod(item)} style={[styles.tab, period === item && styles.tabActive]}><Text style={[styles.tabText, period === item && styles.tabTextActive]}>{item}</Text></Pressable>)}</View><View style={styles.podium}><View style={[styles.podiumGlow, { backgroundColor: colors.light.accent + '22' }]} /><Text style={styles.podiumEyebrow}>{period.toUpperCase()} RANKINGS</Text><Text style={styles.podiumTitle}>Every point counts.</Text><Text style={styles.podiumBody}>Keep playing to move up the board and claim your place.</Text><View style={styles.podiumStats}><Text style={styles.podiumStat}><Text style={styles.podiumValue}>4,982</Text>{' '}players</Text><Text style={styles.podiumStat}><Text style={[styles.podiumValue, { color: colors.light.primary }]}>18h</Text>{' '}remaining</Text></View></View><SectionHeader title="Top players" action="Updated just now" />{players.map((player) => <View key={player.rank} style={[styles.player, player.name === 'You' && styles.you]}><Text style={styles.rank}>{player.tag}</Text><View style={[styles.playerAvatar, { backgroundColor: player.tone }]}><Text style={styles.playerInitial}>{player.name.slice(0, 1)}</Text></View><View style={styles.playerCopy}><Text style={styles.playerName}>{player.name}</Text><Text style={styles.playerMeta}>LEVEL {player.rank === 4 ? '07' : '0' + (10 - player.rank)}</Text></View><View style={styles.score}><Text style={styles.scoreValue}>{player.score}</Text><Text style={styles.scoreLabel}>XP</Text></View></View>)}</Screen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  eyebrow: { color: colors.light.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  title: { color: colors.light.foreground, fontSize: 30, fontWeight: '800', marginTop: 7 },
  trophy: { width: 45, height: 45, borderRadius: 15, backgroundColor: colors.light.accent + '20', borderWidth: 1, borderColor: colors.light.accent + '65', alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: colors.light.card, borderRadius: 15, padding: 4, borderWidth: 1, borderColor: colors.light.border },
  tab: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  tabActive: { backgroundColor: colors.light.primary },
  tabText: { color: colors.light.mutedForeground, fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: colors.light.primaryForeground },
  podium: { minHeight: 164, backgroundColor: colors.light.card, borderRadius: 23, borderWidth: 1, borderColor: colors.light.border, padding: 20, overflow: 'hidden' },
  podiumGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -30, top: -75 },
  podiumEyebrow: { color: colors.light.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  podiumTitle: { color: colors.light.foreground, fontSize: 23, fontWeight: '800', marginTop: 10 },
  podiumBody: { color: colors.light.mutedForeground, fontSize: 12, lineHeight: 18, maxWidth: 230, marginTop: 5 },
  podiumStats: { flexDirection: 'row', gap: 22, marginTop: 18 },
  podiumStat: { color: colors.light.mutedForeground, fontSize: 11 },
  podiumValue: { color: colors.light.foreground, fontWeight: '800' },
  player: { minHeight: 70, borderRadius: 18, backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  you: { borderColor: colors.light.primary + '80', backgroundColor: colors.light.primary + '10' },
  rank: { color: colors.light.mutedForeground, fontSize: 11, fontWeight: '800', width: 20 },
  playerAvatar: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  playerInitial: { color: colors.light.primaryForeground, fontSize: 16, fontWeight: '900' },
  playerCopy: { flex: 1 },
  playerName: { color: colors.light.foreground, fontSize: 14, fontWeight: '800' },
  playerMeta: { color: colors.light.mutedForeground, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 4 },
  score: { alignItems: 'flex-end' },
  scoreValue: { color: colors.light.foreground, fontSize: 14, fontWeight: '900' },
  scoreLabel: { color: colors.light.primary, fontSize: 9, fontWeight: '800', marginTop: 2 },
});