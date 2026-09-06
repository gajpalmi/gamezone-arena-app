import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@/components/Feather';
import colors from '@/constants/colors';
import { useFavorites, useSupabaseAuth } from '@/hooks/useBusiness';

export default function SavedBusinessesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useSupabaseAuth();

  const { data: businesses, isLoading } = useFavorites();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.light.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Saved Listings</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.light.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {businesses?.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="bookmark" size={48} color={colors.light.mutedForeground} />
              <Text style={styles.emptyTitle}>No saved businesses</Text>
              <Text style={styles.emptyDesc}>Businesses you save will appear here for quick access.</Text>
            </View>
          ) : (
            businesses?.map((b) => (
              <Pressable key={b.id} style={styles.card} onPress={() => router.push(`/business/${b.id}` as Href)}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{b.name}</Text>
                  <Feather name="chevron-right" size={20} color={colors.light.mutedForeground} />
                </View>
                <Text style={styles.cardCity}>{b.city}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{b.description}</Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.light.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.light.border },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.light.foreground },
  scrollContent: { padding: 20, gap: 16 },
  card: { backgroundColor: colors.light.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.light.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { color: colors.light.foreground, fontSize: 18, fontWeight: '800', flex: 1, marginRight: 12 },
  cardCity: { color: colors.light.mutedForeground, fontSize: 13, marginBottom: 8 },
  cardDesc: { color: colors.light.mutedForeground, fontSize: 14, lineHeight: 20 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { color: colors.light.foreground, fontSize: 20, fontWeight: '800', marginTop: 16 },
  emptyDesc: { color: colors.light.mutedForeground, fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
});
