import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@/components/Feather';
import colors from '@/constants/colors';
import {
  useBusinessDetail,
  useSetFavorite,
  useSaveReview,
  useReportBusiness,
  useSetBusinessBlocked,
  useSupabaseAuth,
  useFavorites
} from '@/hooks/useBusiness';
import { businessLink, copyLink, shareLink } from '@/lib/share';
import { type ReportReason } from '@/lib/business';

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useSupabaseAuth();

  const { data, isLoading, error, refetch } = useBusinessDetail(id!);
  const { data: favorites } = useFavorites();
  const setFavorite = useSetFavorite();

  const isFavorited = favorites?.some(f => f.id === id);
  const saveReview = useSaveReview();
  const reportBusiness = useReportBusiness();
  const setBusinessBlocked = useSetBusinessBlocked();

  const [reviewBody, setReviewBody] = useState('');
  const [rating, setRating] = useState(5);

  if (isLoading) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.light.primary} size="large" />
      </View>
    );
  }
  if (!data) {
    return <View style={[styles.root, styles.centered, { paddingTop: insets.top, paddingHorizontal: 24 }]}><Feather name="alert-circle" size={36} color={colors.light.destructive} /><Text style={styles.loadError}>{error instanceof Error ? error.message : 'Unable to load this business.'}</Text><Pressable style={styles.retryBtn} onPress={() => void refetch()}><Text style={styles.submitBtnText}>RETRY</Text></Pressable><Pressable style={styles.backRetryBtn} onPress={() => router.back()}><Text style={styles.backRetryText}>GO BACK</Text></Pressable></View>;
  }

  const { business, hours, photos, reviews } = data;
  const openExternal = async (url: string, unavailableMessage: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Unavailable', unavailableMessage);
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open', unavailableMessage);
    }
  };

  const handleMap = () => {
    const hasCoordinates = business.latitude != null && business.longitude != null;
    const q = hasCoordinates
      ? `${business.latitude},${business.longitude}`
      : encodeURIComponent(`${business.name}, ${business.city || ''}`);
    void openExternal(`https://maps.google.com/?q=${q}`, 'No maps app or browser is available.');
  };

  const handleShare = async () => {
    const link = businessLink(business.id);
    try {
      await shareLink(business.name, `Check out ${business.name} on GAMEZONE ARENA Local Directory: ${link}`);
    } catch {
      Alert.alert('Share unavailable', 'Your device could not open the share sheet.');
    }
  };

  const handleCopyLink = () => {
    void copyLink(businessLink(business.id))
      .then(() => Alert.alert('Link copied', 'The business profile link is ready to paste.'))
      .catch(() => Alert.alert('Copy unavailable', 'Your device could not copy the business link.'));
  };

  const handleBlock = () => {
    Alert.alert('Block Business', 'Are you sure you want to block this business? You will no longer see it in search results.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: () => {
          setBusinessBlocked.mutate({ id: business.id, blocked: true }, {
            onSuccess: () => {
              Alert.alert('Business blocked', 'This business will no longer appear in your results.');
              router.back();
            },
            onError: (error: Error) => Alert.alert('Could not block business', error.message || 'Please try again.')
          });
      }}
    ]);
  };

  const handleReport = () => {
    Alert.alert('Report Business', 'Choose the closest reason. You can send feedback after reporting.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Spam', onPress: () => submitReport('spam') },
      { text: 'More reasons', onPress: handleMoreReportReasons },
    ]);
  };

  const handleMoreReportReasons = () => {
    Alert.alert('More report reasons', 'Select a reason.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Inappropriate content', onPress: () => submitReport('inappropriate_content') },
      { text: 'More', onPress: () => handleIncorrectReportReason() },
    ]);
  };
  const handleIncorrectReportReason = () => Alert.alert('More report reasons', 'Select a reason.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Fake or incorrect information', onPress: () => submitReport('incorrect_information') },
    { text: 'More', onPress: () => handleFinalReportReasons() },
  ]);
  const handleFinalReportReasons = () => Alert.alert('Final report reasons', 'Select a reason.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Fraud', onPress: () => submitReport('fraud') },
    { text: 'More', onPress: () => Alert.alert('Final report reasons', 'Select a reason.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Harassment', onPress: () => submitReport('harassment') },
      { text: 'Other', onPress: () => submitReport('other') },
    ]) },
  ]);

  const submitReport = (reason: ReportReason) => {
    reportBusiness.mutate({ id: business.id, reason }, {
      onSuccess: () => Alert.alert('Reported', 'Thank you for keeping our directory safe. For follow-up feedback, contact support from Settings.'),
      onError: (error: Error) => Alert.alert('Could not submit report', error.message || 'Please try again.')
    });
  };

  const handleSaveReview = () => {
    if (!reviewBody.trim()) {
      Alert.alert('Error', 'Please write a review.');
      return;
    }
    saveReview.mutate({ id: business.id, rating, body: reviewBody }, {
      onSuccess: () => {
        setReviewBody('');
        Alert.alert('Success', 'Review saved!');
      },
      onError: (reviewError: Error) => Alert.alert('Could not save review', reviewError.message || 'Your review is still here. Please try again.')
    });
  };

  const today = new Date().getDay(); // 0 = Sunday
  const todaysHours = hours.find((h: any) => h.day_of_week === today);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.light.foreground} />
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Share ${business.name}`} onPress={handleShare} style={styles.actionIcon}>
            <Feather name="share-2" size={20} color={colors.light.foreground} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Copy ${business.name} business profile link`} onPress={handleCopyLink} style={styles.actionIcon}>
            <Feather name="copy" size={20} color={colors.light.foreground} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Report ${business.name}`} onPress={handleReport} style={styles.actionIcon}>
            <Feather name="alert-triangle" size={20} color={colors.light.destructive} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Block ${business.name}`} onPress={handleBlock} style={styles.actionIcon}>
            <Feather name="slash" size={20} color={colors.light.mutedForeground} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{business.name}</Text>
        
        <View style={styles.badges}>
          {business.business_categories?.name && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{business.business_categories.name}</Text>
            </View>
          )}
          {business.subcategory && <View style={styles.badge}><Text style={styles.badgeText}>{business.subcategory}</Text></View>}
          {todaysHours && (
            <View style={[styles.badge, todaysHours.is_closed ? styles.badgeClosed : styles.badgeOpen]}>
              <Text style={[styles.badgeText, todaysHours.is_closed ? styles.badgeTextClosed : styles.badgeTextOpen]}>
                {todaysHours.is_closed ? 'CLOSED TODAY' : `OPEN ${todaysHours.opens_at?.slice(0,5)} - ${todaysHours.closes_at?.slice(0,5)}`}
              </Text>
            </View>
          )}
        </View>

        {photos && photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosScroll}>
            {photos.map((p: any) => (
              <Image
                key={p.id}
                source={{ uri: p.signedUrl }}
                style={styles.photo}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        )}

        <View style={styles.infoGroup}>
          {business.city && (
            <View style={styles.infoRow}>
              <Feather name="map-pin" size={16} color={colors.light.mutedForeground} />
              <Text style={styles.infoText}>{business.city}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Find ${business.name} on a map`} style={[styles.primaryBtn, { backgroundColor: colors.light.card }]} onPress={handleMap}>
            <Feather name="map" size={16} color={colors.light.foreground} />
            <Text style={[styles.primaryBtnText, { color: colors.light.foreground }]}>MAP</Text>
          </Pressable>
          <Pressable disabled={setFavorite.isPending} accessibilityRole="button" accessibilityLabel={isFavorited ? `Remove ${business.name} from saved businesses` : `Save ${business.name}`} style={[styles.primaryBtn, { backgroundColor: colors.light.card }, setFavorite.isPending && { opacity: 0.55 }]} onPress={() => setFavorite.mutate({ id: business.id, favorite: !isFavorited }, { onSuccess: () => Alert.alert(isFavorited ? 'Removed from saved' : 'Saved', `${business.name} has been ${isFavorited ? 'removed from' : 'added to'} your saved businesses.`), onError: (error: Error) => Alert.alert('Could not update saved businesses', error.message || 'Please try again.') })}>
             <Feather name="bookmark" size={16} color={isFavorited ? colors.light.primary : colors.light.foreground} />
          </Pressable>
        </View>
        <Text style={styles.contactNotice}>Contact details appear only through a dedicated public-safe contact projection after explicit owner consent. This listing does not currently have one.</Text>

        <View style={styles.divider} />
        
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.description}>{business.description}</Text>

        <View style={styles.divider} />

        <View style={styles.jobsSection}>
          <View style={styles.jobsHeading}>
            <View>
              <Text style={styles.sectionTitle}>Open Positions</Text>
              <Text style={styles.jobsDescription}>Explore jobs posted by {business.name}.</Text>
            </View>
            <Feather name="briefcase" size={22} color={colors.light.primary} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View jobs at ${business.name}`}
            style={styles.jobsButton}
            onPress={() => router.push(`/business/jobs/discover?businessId=${business.id}` as any)}
          >
            <Text style={styles.jobsButtonText}>JOBS &amp; HIRING</Text>
            <Feather name="arrow-right" size={16} color={colors.light.primaryForeground} />
          </Pressable>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Reviews</Text>
        <View style={styles.writeReview}>
          <Text style={styles.writeReviewTitle}>Write a review</Text>
          <View style={styles.ratingRow}>
            {[1,2,3,4,5].map(r => (
              <Pressable key={r} onPress={() => setRating(r)}>
                <Feather name="star" size={24} color={r <= rating ? '#FFB45E' : colors.light.muted} />
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.reviewInput}
            placeholder="Share your experience..."
            placeholderTextColor={colors.light.mutedForeground}
            multiline
            value={reviewBody}
            onChangeText={setReviewBody}
          />
          <Pressable style={styles.submitBtn} onPress={handleSaveReview} disabled={saveReview.isPending}>
             <Text style={styles.submitBtnText}>{saveReview.isPending ? 'SAVING...' : 'SUBMIT'}</Text>
          </Pressable>
        </View>

        {reviews.length > 0 ? (
          <View style={styles.reviewsList}>
            {reviews.map((rev: any) => (
              <View key={rev.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.stars}>
                    {[1,2,3,4,5].map(r => (
                      <Feather key={r} name="star" size={12} color={r <= rev.rating ? '#FFB45E' : colors.light.muted} />
                    ))}
                  </View>
                  <Text style={styles.reviewDate}>{new Date(rev.created_at).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.reviewBody}>{rev.body}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noReviews}>No reviews yet. Be the first!</Text>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.light.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.light.border },
  headerActions: { flexDirection: 'row', gap: 12 },
  actionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.light.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.light.border },
  scrollContent: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: '900', color: colors.light.foreground, marginBottom: 12 },
  badges: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.light.primary + '20' },
  badgeText: { color: colors.light.primary, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  badgeOpen: { backgroundColor: '#4ADE8020' },
  badgeTextOpen: { color: '#4ADE80' },
  badgeClosed: { backgroundColor: colors.light.destructive + '20' },
  badgeTextClosed: { color: colors.light.destructive },
  ownerStatus: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.light.foreground + '14' },
  ownerStatusText: { color: colors.light.foreground, fontSize: 11, fontWeight: '900' },
  photosScroll: { gap: 12, marginBottom: 20 },
  photo: { width: 280, height: 180, borderRadius: 16, backgroundColor: colors.light.card },
  infoGroup: { gap: 10, marginBottom: 20, backgroundColor: colors.light.card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.light.border },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoText: { color: colors.light.foreground, fontSize: 14, flex: 1, lineHeight: 20 },
   website: { color: colors.light.primary, textDecorationLine: 'underline' },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  primaryBtn: { flex: 1, height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryBtnText: { color: '#050A17', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: colors.light.border, marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.light.foreground, marginBottom: 12 },
  description: { color: colors.light.mutedForeground, fontSize: 15, lineHeight: 24 },
  jobsSection: { backgroundColor: colors.light.card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.light.border },
  jobsHeading: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  jobsDescription: { color: colors.light.mutedForeground, fontSize: 13, lineHeight: 19, marginTop: -5, marginBottom: 14 },
  jobsButton: { height: 42, borderRadius: 10, backgroundColor: colors.light.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  jobsButtonText: { color: colors.light.primaryForeground, fontSize: 12, fontWeight: '900', letterSpacing: 0.4 },
  writeReview: { backgroundColor: colors.light.card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.light.border, marginBottom: 20 },
  writeReviewTitle: { color: colors.light.foreground, fontSize: 14, fontWeight: '700', marginBottom: 12 },
  ratingRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  reviewInput: { backgroundColor: colors.light.input, borderRadius: 12, padding: 12, color: colors.light.foreground, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
  submitBtn: { backgroundColor: colors.light.primary, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: colors.light.primaryForeground, fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  reviewsList: { gap: 12 },
  reviewCard: { backgroundColor: colors.light.card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.light.border },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  stars: { flexDirection: 'row', gap: 4 },
  reviewDate: { color: colors.light.mutedForeground, fontSize: 11 },
  reviewBody: { color: colors.light.foreground, fontSize: 14, lineHeight: 20 },
  noReviews: { color: colors.light.mutedForeground, fontSize: 14, fontStyle: 'italic' },
  loadError: { color: colors.light.foreground, textAlign: 'center', fontSize: 15, lineHeight: 22, marginTop: 12, marginBottom: 16 },
  retryBtn: { backgroundColor: colors.light.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
   backRetryBtn: { marginTop: 12, padding: 8 },
   backRetryText: { color: colors.light.primary, fontWeight: '800' },
   contactNotice: { color: colors.light.mutedForeground, fontSize: 12, lineHeight: 18, marginTop: -12, marginBottom: 16 },
});
