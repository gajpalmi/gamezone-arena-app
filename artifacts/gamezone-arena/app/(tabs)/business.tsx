import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@/components/Feather';
import { CategoryPicker } from '@/components/CategoryPicker';
import colors from '@/constants/colors';
import { useBrowseBusinesses, useCategories, useSupabaseAuth } from '@/hooks/useBusiness';
import { useOfferingBasketCount } from '@/hooks/useOfferings';
import { appLink, shareLink } from '@/lib/share';

export default function BusinessDiscoveryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Ensure auth is passed to supabase
  const auth = useSupabaseAuth();
  const basketCount = useOfferingBasketCount(auth.ready);

  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [submitted, setSubmitted] = useState({ query: '', city: '', categoryId: undefined as string | undefined });
  const [page, setPage] = useState(0);
  const [businesses, setBusinesses] = useState<any[]>([]);

  const categories = useCategories();
  const categoriesData = categories.data;
  const applySearch = () => {
    setBusinesses([]);
    setPage(0);
    setSubmitted({ query, city, categoryId: selectedCategory });
  };
  
  const options = useMemo(() => ({
    query: submitted.query || undefined,
    city: submitted.city || undefined,
    categoryId: submitted.categoryId,
    page,
    pageSize: 20
  }), [submitted, page]);

  const { data: browseData, isLoading: loadingBusinesses, error: businessesError, refetch, isRefetching } = useBrowseBusinesses(options);
  useEffect(() => {
    if (!browseData) return;
    setBusinesses((previous) => {
      if (browseData.page === 0) return browseData.data;
      const known = new Set(previous.map((business) => business.id));
      return [...previous, ...browseData.data.filter((business) => !known.has(business.id))];
    });
  }, [browseData]);
  
  const handleLoadMore = () => {
    if (browseData && browseData.count > (page + 1) * 20) {
      setPage(p => p + 1);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Local Directory</Text>
      <Pressable
        testID="business-jobs-hiring"
        accessibilityRole="button"
        accessibilityLabel="Open Jobs and Hiring"
        style={styles.jobsCard}
        onPress={() => router.push('/business/jobs/discover' as Href)}
      >
        <View style={styles.jobsCopy}>
          <Text style={styles.jobsTitle}>💼 Jobs &amp; Hiring</Text>
          <Text style={styles.jobsDetail}>Find jobs, hire workers, and manage applications.</Text>
        </View>
        <Feather name="chevron-right" size={22} color={colors.light.primary} />
      </Pressable>
      <View style={styles.quickActions}>
        {[
          ['🔎 Find Jobs', '/business/jobs/discover'], ['💼 Post a Job', '/business/jobs/edit'], ['👤 Find Workers', '/business/jobs/workers'],
          ['📋 My Job', '/business/jobs/mine'], ['📄 My Applications', '/business/jobs/applications'], ['❤️ Saved Jobs', '/business/jobs/saved'],
           ['📩 Job Messages', '/business/jobs/messages'], ['🔔 Job Notifications', '/business/jobs/settings'],
           [`🛒 My Basket${(basketCount.data ?? 0) > 0 ? ` (${basketCount.data})` : ''}`, '/business/offering/basket'],
          ['➕ Add Business', '/business/edit'], ['🏢 My Business', '/business/mine'],
          ['🛍️ Add Product', '/business/offering/edit?kind=product'],
          ['🛠️ Add Service', '/business/offering/edit?kind=service'], ['📋 My Products & Services', '/business/offerings-mine'],
          ['❤️ Saved', '/business/offerings-saved'], ['🔍 Search Listings', '/business/offerings'],
          ['⚙️ Settings', '/settings'],
        ].map(([label, path]) => <Pressable key={label} testID={`business-${label.replace(/\W/g, '-').toLowerCase()}`} style={styles.quickAction} onPress={() => router.push(path as Href)}><Text style={styles.quickText}>{label}</Text></Pressable>)}
        <Pressable testID="business-location-area" style={styles.quickAction} onPress={() => router.push('/business/offerings' as Href)}>
          <Text style={styles.quickText}>📍 Location / City / Area</Text>
        </Pressable>
        <Pressable testID="business-contact" style={styles.quickAction} onPress={() => router.push('/business/offerings' as Href)}>
          <Text style={styles.quickText}>📞 Contact Business</Text>
        </Pressable>
        <Pressable
          testID="business-share"
          style={styles.quickAction}
          onPress={() => void shareLink('GAMEZONE ARENA Local Directory', `Discover local businesses, products, and services on GAMEZONE ARENA: ${appLink}`).catch(() => Alert.alert('Share unavailable', 'Your device could not open the share sheet.'))}
        >
          <Text style={styles.quickText}>📤 Share</Text>
        </Pressable>
      </View>
      
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Saved businesses" style={styles.actionBtn} onPress={() => router.push('/business/saved' as Href)}>
          <Feather name="bookmark" size={20} color={colors.light.primary} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="My Businesses" style={styles.actionBtn} onPress={() => router.push('/business/mine' as Href)}>
          <Feather name="briefcase" size={20} color={colors.light.accent} />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <Feather name="search" size={16} color={colors.light.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search shops & services..."
            placeholderTextColor={colors.light.mutedForeground}
            value={query}
             onChangeText={setQuery}
             onSubmitEditing={applySearch}
             returnKeyType="search"
          />
        </View>
        <View style={styles.searchInputContainer}>
          <Feather name="map-pin" size={16} color={colors.light.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="City / Area"
            placeholderTextColor={colors.light.mutedForeground}
            value={city}
             onChangeText={setCity}
             onSubmitEditing={applySearch}
             returnKeyType="search"
          />
        </View>
      </View>

      <CategoryPicker categories={categoriesData ?? []} selectedId={selectedCategory} onChoose={item => setSelectedCategory(item.id)} loading={categories.isLoading} error={categories.error} onRetry={() => void categories.refetch()}/>
      <Pressable style={[styles.categoryBadge, styles.categoryBadgeActive]} onPress={applySearch}><Text style={styles.categoryTextActive}>Search / Apply Filters</Text></Pressable>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {renderHeader()}

      {loadingBusinesses && page === 0 ? (
        <ActivityIndicator style={styles.loader} color={colors.light.primary} />
      ) : businessesError && page === 0 ? (
        <View style={styles.empty}>
          <Feather name="alert-circle" size={40} color={colors.light.destructive} />
          <Text style={styles.emptyText}>Unable to load businesses</Text>
          <Text style={styles.emptySub}>{businessesError instanceof Error ? businessesError.message : 'Please try again.'}</Text>
          <Pressable style={styles.retryButton} onPress={() => void refetch()}><Text style={styles.retryText}>RETRY</Text></Pressable>
        </View>
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const isNew = new Date(item.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;
            return (
            <Pressable
              style={styles.businessCard}
              onPress={() => router.push(`/business/${item.id}` as Href)}
            >
              <View style={styles.cardContent}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  {isNew && <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>}
                </View>
                <View style={styles.cardMeta}>
                  {item.business_categories?.name && (
                    <View style={styles.metaBadge}>
                      <Text style={styles.metaText}>{item.business_categories.name}</Text>
                    </View>
                  )}
                  {item.city && (
                    <View style={styles.metaBadgeLine}>
                      <Feather name="map-pin" size={12} color={colors.light.mutedForeground} />
                      <Text style={styles.metaTextLine}>{item.city}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.light.mutedForeground} />
            </Pressable>
            );
          }}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.light.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="search" size={40} color={colors.light.mutedForeground} />
              <Text style={styles.emptyText}>No businesses found</Text>
              <Text style={styles.emptySub}>Try adjusting your search or filters</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.light.foreground,
    marginBottom: 16,
  },
  jobsCard: { backgroundColor: colors.light.primary + '14', borderColor: colors.light.primary + '55', borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  jobsCopy: { flex: 1, paddingRight: 12 },
  jobsTitle: { color: colors.light.foreground, fontSize: 17, fontWeight: '900', marginBottom: 4 },
  jobsDetail: { color: colors.light.mutedForeground, fontSize: 12, lineHeight: 17 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  quickAction: { backgroundColor: colors.light.card, borderColor: colors.light.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9 },
  quickText: { color: colors.light.primary, fontSize: 11, fontWeight: '800' },
  actions: {
    position: 'absolute',
    right: 20,
    top: 16,
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.light.card,
    borderWidth: 1,
    borderColor: colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: colors.light.foreground,
    fontSize: 14,
    marginLeft: 8,
  },
  categories: {
    marginBottom: 4,
  },
  categoryBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.light.card,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  categoryBadgeActive: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  categoryText: {
    color: colors.light.mutedForeground,
    fontSize: 13,
    fontWeight: '700',
  },
  categoryTextActive: {
    color: colors.light.primaryForeground,
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  businessCard: {
    backgroundColor: colors.light.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    paddingRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    color: colors.light.foreground,
    fontSize: 16,
    fontWeight: '800',
  },
  newBadge: {
    backgroundColor: colors.light.accent + '30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    color: colors.light.accent,
    fontSize: 9,
    fontWeight: '900',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  metaBadge: {
    backgroundColor: colors.light.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaText: {
    color: colors.light.primary,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metaBadgeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaTextLine: {
    color: colors.light.mutedForeground,
    fontSize: 12,
  },
  cardDesc: {
    color: colors.light.mutedForeground,
    fontSize: 13,
    lineHeight: 18,
  },
  loader: {
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    color: colors.light.foreground,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 16,
  },
  emptySub: {
    color: colors.light.mutedForeground,
    fontSize: 13,
    marginTop: 8,
  },
   retryButton: { backgroundColor: colors.light.primary, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11, marginTop: 16 },
   retryText: { color: colors.light.primaryForeground, fontSize: 12, fontWeight: '900' },
});
