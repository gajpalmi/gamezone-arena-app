import { Feather } from '@expo/vector-icons';
import { useAuth, useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, SectionHeader } from '@/components/Screen';
import colors from '@/constants/colors';

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const name = user?.firstName || 'Alex';
  return <Screen><View style={styles.header}><Text style={styles.eyebrow}>PLAYER PROFILE</Text><Pressable style={styles.settings}><Feather name="settings" size={18} color={colors.light.foreground} /></Pressable></View><View style={styles.profile}><View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text></View><Text style={styles.name}>{name}</Text><Text style={styles.handle}>{user?.primaryEmailAddress?.emailAddress || 'LEVEL 07 PLAYER'}</Text><View style={styles.level}><Text style={styles.levelText}>LEVEL 07</Text><View style={styles.levelLine}><View style={styles.levelFill} /></View><Text style={styles.levelXp}>2,480 XP</Text></View></View><View style={styles.stats}><Stat value="126" label="GAMES" /><Stat value="18" label="WINS" /><Stat value="07" label="STREAK" /></View><SectionHeader title="Your progress" action="View all" /><View style={styles.achievement}><View style={styles.achievementIcon}><Feather name="award" size={20} color={colors.light.accent} /></View><View style={styles.achievementCopy}><Text style={styles.achievementTitle}>Speed demon</Text><Text style={styles.achievementText}>Top 10% reaction time this week</Text></View><Feather name="check-circle" size={19} color={colors.light.primary} /></View><View style={styles.menu}><MenuItem icon="edit-3" label="Edit profile" /><MenuItem icon="bell" label="Notifications" /><MenuItem icon="shield" label="Privacy & security" /><MenuItem icon="help-circle" label="Help center" /></View><Pressable onPress={async () => { await signOut(); router.replace('/'); }} style={styles.signOut}><Feather name="log-out" size={17} color={colors.light.destructive} /><Text style={styles.signOutText}>Sign out</Text></Pressable></Screen>;
}

function Stat({ value, label }: { value: string; label: string }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
function MenuItem({ icon, label }: { icon: keyof typeof Feather.glyphMap; label: string }) { return <Pressable style={styles.menuItem}><View style={styles.menuIcon}><Feather name={icon} size={17} color={colors.light.primary} /></View><Text style={styles.menuLabel}>{label}</Text><Feather name="chevron-right" size={17} color={colors.light.mutedForeground} /></Pressable>; }

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.light.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  settings: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border, alignItems: 'center', justifyContent: 'center' },
  profile: { alignItems: 'center', backgroundColor: colors.light.card, borderRadius: 23, borderWidth: 1, borderColor: colors.light.border, padding: 22 },
  avatar: { width: 74, height: 74, borderRadius: 25, backgroundColor: colors.light.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.light.primaryForeground, fontSize: 30, fontWeight: '900' },
  name: { color: colors.light.foreground, fontSize: 22, fontWeight: '900', marginTop: 13 },
  handle: { color: colors.light.mutedForeground, fontSize: 11, marginTop: 5 },
  level: { width: '100%', marginTop: 18 },
  levelText: { color: colors.light.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  levelLine: { height: 5, borderRadius: 3, backgroundColor: colors.light.muted, marginTop: 8 },
  levelFill: { width: '82%', height: 5, borderRadius: 3, backgroundColor: colors.light.primary },
  levelXp: { color: colors.light.mutedForeground, fontSize: 10, marginTop: 5, textAlign: 'right' },
  stats: { flexDirection: 'row', backgroundColor: colors.light.card, borderRadius: 20, borderWidth: 1, borderColor: colors.light.border, paddingVertical: 14 },
  stat: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.light.border },
  statValue: { color: colors.light.foreground, fontSize: 18, fontWeight: '900' },
  statLabel: { color: colors.light.mutedForeground, fontSize: 9, letterSpacing: 1, fontWeight: '800', marginTop: 4 },
  achievement: { minHeight: 78, borderRadius: 18, backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  achievementIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.light.accent + '18', alignItems: 'center', justifyContent: 'center' },
  achievementCopy: { flex: 1 },
  achievementTitle: { color: colors.light.foreground, fontSize: 13, fontWeight: '800' },
  achievementText: { color: colors.light.mutedForeground, fontSize: 11, marginTop: 4 },
  menu: { backgroundColor: colors.light.card, borderRadius: 20, borderWidth: 1, borderColor: colors.light.border, overflow: 'hidden' },
  menuItem: { minHeight: 58, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: colors.light.border },
  menuIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.light.primary + '16', alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, color: colors.light.secondaryForeground, fontSize: 13, fontWeight: '700' },
  signOut: { height: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  signOutText: { color: colors.light.destructive, fontSize: 13, fontWeight: '800' },
});