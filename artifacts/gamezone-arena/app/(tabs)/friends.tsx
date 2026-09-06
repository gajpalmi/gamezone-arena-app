import { Feather } from '@/components/Feather';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, SectionHeader } from '@/components/Screen';
import colors from '@/constants/colors';

export default function FriendsScreen() {
  return <Screen><View style={styles.header}><View><Text style={styles.eyebrow}>YOUR CREW</Text><Text style={styles.title}>Friends</Text></View><View style={styles.add}><Feather name="users" size={18} color={colors.light.primaryForeground} /></View></View><View style={styles.requests}><View style={styles.requestIcon}><Feather name="inbox" size={18} color={colors.light.accent} /></View><View style={styles.requestCopy}><Text style={styles.requestTitle}>Friends unavailable</Text><Text style={styles.requestText}>Friend discovery and requests are not available yet.</Text></View></View><SectionHeader title="Your friends" /><View style={styles.empty}><Feather name="users" size={24} color={colors.light.mutedForeground} /><Text style={styles.emptyTitle}>No friends to show</Text><Text style={styles.emptyText}>Friends will appear here when this feature is available.</Text></View></Screen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  eyebrow: { color: colors.light.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  title: { color: colors.light.foreground, fontSize: 30, fontWeight: '800', marginTop: 7 },
  add: { width: 45, height: 45, borderRadius: 15, backgroundColor: colors.light.primary, alignItems: 'center', justifyContent: 'center' },
  requests: { minHeight: 76, borderRadius: 19, backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.accent + '55', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  requestIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.light.accent + '18', alignItems: 'center', justifyContent: 'center' },
  requestCopy: { flex: 1 },
  requestTitle: { color: colors.light.foreground, fontSize: 13, fontWeight: '800' },
  requestText: { color: colors.light.mutedForeground, fontSize: 11, marginTop: 3 },
  empty: { minHeight: 140, borderRadius: 19, backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyTitle: { color: colors.light.foreground, fontSize: 14, fontWeight: '800', marginTop: 10 },
  emptyText: { color: colors.light.mutedForeground, fontSize: 12, textAlign: 'center', marginTop: 5 },
});