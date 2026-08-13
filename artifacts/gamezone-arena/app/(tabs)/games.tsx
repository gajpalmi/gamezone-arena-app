import { Feather } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { GameCard } from '@/components/GameCard';
import { Screen, SectionHeader } from '@/components/Screen';
import { games } from '@/constants/config';
import colors from '@/constants/colors';

const categories = ['All', 'Puzzle', 'Quiz', 'Memory', 'Reaction', 'Math'];

export default function GamesScreen() {
  const router = useRouter();
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => games.filter((game) => (category === 'All' || game.category === category) && game.title.toLowerCase().includes(query.toLowerCase())), [category, query]);
  return <Screen><View style={styles.heading}><View><Text style={styles.eyebrow}>DISCOVER YOUR EDGE</Text><Text style={styles.title}>Game library</Text></View><View style={styles.count}><Text style={styles.countText}>{games.length}</Text><Text style={styles.countLabel}>LIVE</Text></View></View><View style={styles.search}><Feather name="search" size={18} color={colors.light.mutedForeground} /><TextInput value={query} onChangeText={setQuery} placeholder="Search games" placeholderTextColor={colors.light.mutedForeground} style={styles.searchInput} /><Feather name="sliders" size={17} color={colors.light.primary} /></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>{categories.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.category, category === item && styles.categoryActive]}><Text style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item}</Text></Pressable>)}</ScrollView><SectionHeader title="All games" action={`${filtered.length} available`} />{filtered.map((game) => <GameCard key={game.id} game={game} wide onPress={() => router.push('/games' as Href)} />)}</Screen>;
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  eyebrow: { color: colors.light.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  title: { color: colors.light.foreground, fontSize: 30, fontWeight: '800', marginTop: 7 },
  count: { alignItems: 'flex-end' },
  countText: { color: colors.light.foreground, fontSize: 24, fontWeight: '900' },
  countLabel: { color: colors.light.mutedForeground, fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
  search: { height: 52, borderRadius: 16, backgroundColor: colors.light.input, borderWidth: 1, borderColor: colors.light.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 10 },
  searchInput: { flex: 1, color: colors.light.foreground, fontSize: 14 },
  categories: { gap: 8, paddingRight: 20 },
  category: { paddingHorizontal: 16, height: 34, borderRadius: 12, backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border, justifyContent: 'center' },
  categoryActive: { backgroundColor: colors.light.primary, borderColor: colors.light.primary },
  categoryText: { color: colors.light.mutedForeground, fontSize: 12, fontWeight: '700' },
  categoryTextActive: { color: colors.light.primaryForeground },
});