import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@/components/Feather';
import colors from '@/constants/colors';
import { useMyBusinesses, useDeleteBusiness, useSubmitBusiness, useSupabaseAuth } from '@/hooks/useBusiness';
import { BUSINESS_STATUS_LABELS } from '@/constants/business';
import { businessLink, shareLink } from '@/lib/share';

export default function MyBusinessesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useSupabaseAuth();

  const { data: businesses, isLoading, isError, error, refetch, isFetching } = useMyBusinesses();
  const deleteBusiness = useDeleteBusiness();
  const submitBusiness = useSubmitBusiness();

  const handleDelete = (id: string, name: string) => {
    if (deleteBusiness.isPending) return;
    Alert.alert('Delete Business', `Are you sure you want to delete ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteBusiness.mutate(id, { onSuccess: () => Alert.alert('Listing deleted', `${name} has been deleted.`), onError: (error: Error) => Alert.alert('Unable to delete', error.message || 'Please try again.') }) }
    ]);
  };

  const handleSubmit = (id: string, name: string) => {
    if (submitBusiness.isPending) return;
    Alert.alert('Submit for Review', `Submit ${name} for moderation? You won't be able to edit it while pending.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Submit', onPress: () => submitBusiness.mutate(id, { onSuccess: () => Alert.alert('Submitted for review', `${name} is pending moderation.`), onError: (error: Error) => Alert.alert('Unable to submit', error.message || 'Please try again.') }) }
    ]);
  };

  const renderStatusBadge = (status: string) => {
    let color = colors.light.mutedForeground;
    let bg = colors.light.border;
    if (status === 'approved') { color = '#4ADE80'; bg = '#4ADE8020'; }
    if (status === 'pending') { color = '#FFB45E'; bg = '#FFB45E20'; }
    if (status === 'rejected') { color = colors.light.destructive; bg = colors.light.destructive + '20'; }
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: bg }]}>
        <Text style={[styles.statusText, { color }]}>
          {BUSINESS_STATUS_LABELS[status as keyof typeof BUSINESS_STATUS_LABELS] || status.toUpperCase()}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.light.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>My Businesses</Text>
        <Pressable onPress={() => router.push('/business/edit' as Href)} style={styles.addBtn}>
          <Feather name="plus" size={20} color={colors.light.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.light.primary} size="large" />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Feather name="alert-circle" size={40} color={colors.light.destructive} />
          <Text style={styles.emptyTitle}>Unable to load your businesses</Text>
          <Text style={styles.emptyDesc}>{error instanceof Error ? error.message : 'Please check your connection and try again.'}</Text>
          <Pressable disabled={isFetching} style={styles.primaryBtn} onPress={() => void refetch()}>
            {isFetching ? <ActivityIndicator color={colors.light.primaryForeground} /> : <Text style={styles.primaryBtnText}>RETRY</Text>}
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {businesses?.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="briefcase" size={48} color={colors.light.mutedForeground} />
              <Text style={styles.emptyTitle}>No businesses yet</Text>
              <Text style={styles.emptyDesc}>Create a listing to offer your services in the local directory.</Text>
              <Pressable style={styles.primaryBtn} onPress={() => router.push('/business/edit' as Href)}>
                <Text style={styles.primaryBtnText}>CREATE LISTING</Text>
              </Pressable>
            </View>
          ) : (
            businesses?.map((b) => (
              <View key={b.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  {b.business_photos?.[0]?.signedUrl && <Image source={{ uri: b.business_photos.find((photo) => photo.is_logo)?.signedUrl || b.business_photos[0].signedUrl }} style={styles.thumbnail} />}
                  <Text style={styles.cardTitle}>{b.name}</Text>
                  {renderStatusBadge(b.status)}
                </View>
                <Text style={styles.cardCity}>{b.city}</Text>

                {b.status === 'rejected' && b.rejection_reason && (
                  <View style={styles.rejectionBox}>
                    <Feather name="alert-circle" size={14} color={colors.light.destructive} />
                    <Text style={styles.rejectionText}>{b.rejection_reason}</Text>
                  </View>
                )}

                <View style={styles.cardActions}>
                  {['draft', 'rejected'].includes(b.status) && (
                    <Pressable style={styles.actionBtn} onPress={() => router.push(`/business/edit?id=${b.id}` as Href)}>
                      <Feather name="edit-2" size={16} color={colors.light.foreground} />
                      <Text style={styles.actionText}>EDIT</Text>
                    </Pressable>
                  )}
                  <Pressable style={styles.actionBtn} onPress={() => router.push(`/business/${b.id}` as Href)}>
                    <Feather name="eye" size={16} color={colors.light.foreground} />
                    <Text style={styles.actionText}>VIEW</Text>
                  </Pressable>
                  <Pressable style={styles.actionBtnIcon} onPress={() => void shareLink(b.name, `Check out ${b.name} on GAMEZONE ARENA: ${businessLink(b.id)}`).catch(() => Alert.alert('Share unavailable', 'Your device could not open the share sheet.'))}>
                    <Feather name="share-2" size={16} color={colors.light.primary} />
                  </Pressable>
                  {['draft', 'rejected'].includes(b.status) && (
                    <Pressable disabled={submitBusiness.isPending} style={[styles.actionBtn, styles.actionBtnSubmit, submitBusiness.isPending && { opacity: 0.5 }]} onPress={() => handleSubmit(b.id, b.name)}>
                      <Feather name="send" size={16} color={colors.light.primaryForeground} />
                      <Text style={[styles.actionText, { color: colors.light.primaryForeground }]}>SUBMIT</Text>
                    </Pressable>
                  )}
                  {['draft', 'pending', 'rejected'].includes(b.status) && (
                    <Pressable disabled={deleteBusiness.isPending} style={[styles.actionBtnIcon, deleteBusiness.isPending && { opacity: 0.5 }]} onPress={() => handleDelete(b.id, b.name)}>
                      <Feather name="trash-2" size={16} color={colors.light.destructive} />
                    </Pressable>
                  )}
                </View>
              </View>
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
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.light.primary + '20', alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 20, gap: 16 },
  card: { backgroundColor: colors.light.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.light.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  thumbnail: { width: 42, height: 42, borderRadius: 10, marginRight: 10, backgroundColor: colors.light.input },
  cardTitle: { color: colors.light.foreground, fontSize: 18, fontWeight: '800', flex: 1, marginRight: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  cardCity: { color: colors.light.mutedForeground, fontSize: 13, marginBottom: 16 },
  rejectionBox: { backgroundColor: colors.light.destructive + '10', padding: 12, borderRadius: 8, flexDirection: 'row', gap: 8, marginBottom: 16 },
  rejectionText: { color: colors.light.destructive, fontSize: 12, flex: 1 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, height: 40, borderRadius: 10, backgroundColor: colors.light.input, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionBtnSubmit: { backgroundColor: colors.light.primary },
  actionBtnIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.light.destructive + '15', alignItems: 'center', justifyContent: 'center' },
  actionText: { color: colors.light.foreground, fontSize: 12, fontWeight: '800' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { color: colors.light.foreground, fontSize: 20, fontWeight: '800', marginTop: 16 },
  emptyDesc: { color: colors.light.mutedForeground, fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 24, paddingHorizontal: 20 },
  primaryBtn: { backgroundColor: colors.light.primary, paddingHorizontal: 24, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: colors.light.primaryForeground, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
});
