import { Feather } from '@/components/Feather';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen, SectionHeader } from '@/components/Screen';
import colors from '@/constants/colors';

const friends = [{ name: 'LunaCircuit', status: 'Playing Quick Quiz', tone: '#C66BFF' }, { name: 'Milo.exe', status: 'Last seen 12m ago', tone: '#7CF2B2' }, { name: 'RogueMint', status: 'On a 5 day streak', tone: '#FFB45E' }];

export default function FriendsScreen() {
  return <Screen><View style={styles.header}><View><Text style={styles.eyebrow}>YOUR CREW</Text><Text style={styles.title}>Friends</Text></View><Pressable style={styles.add}><Feather name="user-plus" size={18} color={colors.light.primaryForeground} /></Pressable></View><View style={styles.search}><Feather name="search" size={18} color={colors.light.mutedForeground} /><TextInput placeholder="Find a player" placeholderTextColor={colors.light.mutedForeground} style={styles.input} /></View><View style={styles.requests}><View style={styles.requestIcon}><Feather name="inbox" size={18} color={colors.light.accent} /></View><View style={styles.requestCopy}><Text style={styles.requestTitle}>Friend requests</Text><Text style={styles.requestText}>2 players want to join your crew</Text></View><View style={styles.requestCount}><Text style={styles.requestCountText}>2</Text></View><Feather name="chevron-right" size={18} color={colors.light.mutedForeground} /></View><SectionHeader title="Your friends" action={`${friends.length} online`} />{friends.map((friend) => <View key={friend.name} style={styles.friend}><View style={[styles.avatar, { backgroundColor: friend.tone }]}><Text style={styles.avatarText}>{friend.name.slice(0, 1)}</Text><View style={styles.online} /></View><View style={styles.friendCopy}><Text style={styles.friendName}>{friend.name}</Text><Text style={styles.friendStatus}>{friend.status}</Text></View><Pressable style={styles.more}><Feather name="more-horizontal" size={19} color={colors.light.mutedForeground} /></Pressable></View>)}</Screen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  eyebrow: { color: colors.light.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  title: { color: colors.light.foreground, fontSize: 30, fontWeight: '800', marginTop: 7 },
  add: { width: 45, height: 45, borderRadius: 15, backgroundColor: colors.light.primary, alignItems: 'center', justifyContent: 'center' },
  search: { height: 52, borderRadius: 16, backgroundColor: colors.light.input, borderWidth: 1, borderColor: colors.light.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 10 },
  input: { flex: 1, color: colors.light.foreground, fontSize: 14 },
  requests: { minHeight: 76, borderRadius: 19, backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.accent + '55', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  requestIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.light.accent + '18', alignItems: 'center', justifyContent: 'center' },
  requestCopy: { flex: 1 },
  requestTitle: { color: colors.light.foreground, fontSize: 13, fontWeight: '800' },
  requestText: { color: colors.light.mutedForeground, fontSize: 11, marginTop: 3 },
  requestCount: { width: 24, height: 24, borderRadius: 8, backgroundColor: colors.light.accent, alignItems: 'center', justifyContent: 'center' },
  requestCountText: { color: colors.light.primaryForeground, fontWeight: '900', fontSize: 12 },
  friend: { minHeight: 70, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarText: { color: colors.light.primaryForeground, fontSize: 17, fontWeight: '900' },
  online: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#7CF2B2', borderWidth: 2, borderColor: colors.light.background, position: 'absolute', right: -1, bottom: -1 },
  friendCopy: { flex: 1 },
  friendName: { color: colors.light.foreground, fontSize: 14, fontWeight: '800' },
  friendStatus: { color: colors.light.mutedForeground, fontSize: 11, marginTop: 4 },
  more: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});