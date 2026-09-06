import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@/components/Feather';
import colors from '@/constants/colors';
import { useAdminQueue, useAdminModerate, useBusinessAdmin, useSupabaseAuth } from '@/hooks/useBusiness';
import { useOfferingAction, useOfferingAdminQueue } from '@/hooks/useOfferings';

export default function AdminScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useSupabaseAuth();
  const { data: isAdmin, isLoading: checkingAdmin } = useBusinessAdmin();
  const { data, isLoading, error } = useAdminQueue(isAdmin === true);
  const adminModerate = useAdminModerate();
  const { data: offeringData } = useOfferingAdminQueue(isAdmin === true);
  const offeringAction = useOfferingAction();

  if (checkingAdmin) {
    return <View style={[styles.root, styles.centered, { paddingTop: insets.top }]}><ActivityIndicator color={colors.light.primary} size="large" /></View>;
  }
  if (!isAdmin) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top }]}>
        <Feather name="shield-off" size={48} color={colors.light.destructive} />
        <Text style={styles.errorTitle}>Access Denied</Text>
        <Text style={styles.errorDesc}>You do not have permission to view the moderation queue.</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top }]}>
        <Feather name="shield-off" size={48} color={colors.light.destructive} />
        <Text style={styles.errorTitle}>Access Denied</Text>
        <Text style={styles.errorDesc}>You do not have permission to view the moderation queue.</Text>
        <Pressable style={styles.backBtnLarge} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>GO BACK</Text>
        </Pressable>
      </View>
    );
  }

  const handleModerate = (type: any, id: string, action: string) => {
    let reason = '';
    if (action === 'reject' || action === 'suspend') {
      reason = 'Violates guidelines'; // In a real app, you might prompt for a reason
    }
    
    Alert.alert(`Confirm ${action.toUpperCase()}`, `Are you sure you want to ${action} this ${type}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => {
        adminModerate.mutate({ targetType: type, targetId: id, action, reason }, {
          onSuccess: () => Alert.alert('Success', `${type} has been ${action}ed.`)
        });
      }}
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.light.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Moderation Queue</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.light.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Pending Businesses ({data?.businesses?.length || 0})</Text>
          {data?.businesses?.length === 0 && <Text style={styles.emptyText}>No pending businesses.</Text>}
          
          {data?.businesses?.map((b) => (
            <View key={b.id} style={styles.card}>
              <Text style={styles.cardTitle}>{b.name}</Text>
              <Text style={styles.cardDesc}>{b.description}</Text>
              
              <View style={styles.actionRow}>
                <Pressable style={[styles.actionBtn, { backgroundColor: '#4ADE8020' }]} onPress={() => handleModerate('business', b.id, 'approve')}>
                  <Text style={[styles.actionText, { color: '#4ADE80' }]}>APPROVE</Text>
                </Pressable>
                <Pressable style={[styles.actionBtn, { backgroundColor: colors.light.destructive + '20' }]} onPress={() => handleModerate('business', b.id, 'reject')}>
                  <Text style={[styles.actionText, { color: colors.light.destructive }]}>REJECT</Text>
                </Pressable>
              </View>
            </View>
          ))}

          <View style={styles.divider} />
           <Text style={styles.sectionTitle}>Pending Products & Services ({offeringData?.offerings?.length || 0})</Text>
           {offeringData?.offerings?.length === 0 && <Text style={styles.emptyText}>No pending product or service listings.</Text>}
           {offeringData?.offerings?.map((offering) => (
             <View key={offering.id} style={styles.card}>
               <Text style={styles.cardTitle}>{offering.name}</Text>
               <Text style={styles.cardDesc}>{offering.kind.toUpperCase()} · {offering.category} · {offering.city}</Text>
               <View style={styles.actionRow}>
                 <Pressable testID="approve-offering" style={[styles.actionBtn, { backgroundColor: '#4ADE8020' }]} onPress={() => offeringAction.mutate({ type: 'moderate', id: offering.id, value: 'approve' })}><Text style={[styles.actionText, { color: '#4ADE80' }]}>APPROVE</Text></Pressable>
                 <Pressable style={[styles.actionBtn, { backgroundColor: colors.light.destructive + '20' }]} onPress={() => offeringAction.mutate({ type: 'moderate', id: offering.id, value: 'reject', reason: 'Violates guidelines' })}><Text style={[styles.actionText, { color: colors.light.destructive }]}>REJECT</Text></Pressable>
                 <Pressable style={[styles.actionBtn, { backgroundColor: colors.light.destructive + '20' }]} onPress={() => offeringAction.mutate({ type: 'moderate', id: offering.id, value: 'suspend', reason: 'Moderation action' })}><Text style={[styles.actionText, { color: colors.light.destructive }]}>SUSPEND</Text></Pressable>
               </View>
             </View>
           ))}
           <Text style={styles.sectionTitle}>Offering Reports ({offeringData?.reports?.length || 0})</Text>
           {offeringData?.reports?.map((report: any) => <View key={report.id} style={styles.card}><Text style={styles.reportReason}>{report.reason.toUpperCase()}</Text><Text style={styles.cardDesc}>{report.details || 'No details provided'}</Text><Pressable style={[styles.actionBtn, { backgroundColor: colors.light.primary + '20' }]} onPress={() => offeringAction.mutate({ type: 'resolve-report', id: report.id })}><Text style={[styles.actionText, { color: colors.light.primary }]}>RESOLVE</Text></Pressable></View>)}

          <Text style={styles.sectionTitle}>Reports ({data?.reports?.length || 0})</Text>
          {data?.reports?.length === 0 && <Text style={styles.emptyText}>No open reports.</Text>}
          
          {data?.reports?.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.reportHeader}>
                <Text style={styles.reportReason}>{r.reason.toUpperCase()}</Text>
                <Text style={styles.reportTarget}>{r.business_id ? 'BUSINESS' : 'REVIEW'}</Text>
              </View>
              {r.details ? <Text style={styles.cardDesc}>{r.details}</Text> : null}
              
              <View style={styles.actionRow}>
                <Pressable style={[styles.actionBtn, { backgroundColor: colors.light.primary + '20' }]} onPress={() => handleModerate('report', r.id, 'resolve')}>
                  <Text style={[styles.actionText, { color: colors.light.primary }]}>RESOLVE</Text>
                </Pressable>
                {r.business_id && (
                  <Pressable style={[styles.actionBtn, { backgroundColor: colors.light.destructive + '20' }]} onPress={() => handleModerate('business', r.business_id!, 'suspend')}>
                    <Text style={[styles.actionText, { color: colors.light.destructive }]}>SUSPEND BIZ</Text>
                  </Pressable>
                )}
                {r.review_id && (
                  <Pressable style={[styles.actionBtn, { backgroundColor: colors.light.destructive + '20' }]} onPress={() => handleModerate('review', r.review_id!, 'hide')}>
                    <Text style={[styles.actionText, { color: colors.light.destructive }]}>HIDE REVIEW</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.light.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.light.border },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.light.foreground },
  scrollContent: { padding: 20, gap: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.light.foreground, marginTop: 8 },
  card: { backgroundColor: colors.light.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.light.border },
  cardTitle: { color: colors.light.foreground, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  cardDesc: { color: colors.light.mutedForeground, fontSize: 13, marginBottom: 16 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  emptyText: { color: colors.light.mutedForeground, fontSize: 14, fontStyle: 'italic', marginBottom: 16 },
  divider: { height: 1, backgroundColor: colors.light.border, marginVertical: 8 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  reportReason: { color: colors.light.destructive, fontSize: 12, fontWeight: '800' },
  reportTarget: { color: colors.light.mutedForeground, fontSize: 10, fontWeight: '800' },
  errorTitle: { color: colors.light.foreground, fontSize: 24, fontWeight: '900', marginTop: 24 },
  errorDesc: { color: colors.light.mutedForeground, fontSize: 15, textAlign: 'center', marginTop: 12, marginBottom: 32 },
  backBtnLarge: { backgroundColor: colors.light.primary, paddingHorizontal: 32, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: colors.light.primaryForeground, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
});
