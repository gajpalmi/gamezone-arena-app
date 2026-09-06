import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@/components/Feather';
import colors from '@/constants/colors';

export default function LegalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.light.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Legal & Privacy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.section}>
          <Text style={styles.title}>Business Listing Rules (version 2026-09-06)</Text>
          <Text style={styles.text}>1. Accurate Information: All information provided must be truthful and accurately represent the business.</Text>
          <Text style={styles.text}>2. Appropriate Content: No offensive, explicit, or harmful imagery or text is allowed.</Text>
          <Text style={styles.text}>3. Reviews & Ratings: Businesses must not post fake reviews or manipulate ratings.</Text>
          <Text style={styles.text}>4. Moderation: We reserve the right to suspend or remove any listing that violates these rules.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.title}>Privacy Policy & Data Retention</Text>
          <Text style={styles.text}>- Data Collection: We collect business name, location, contact details, service areas, opening hours, and images for the directory.</Text>
          <Text style={styles.text}>- Data Usage: Approved listing details are displayed publicly to help users find services. Photos are stored privately and delivered through short-lived authorized links.</Text>
          <Text style={styles.text}>- Data Deletion: You can delete eligible business listings from "My Businesses". Account deletion removes associated directory data and private media before your Clerk account is removed.</Text>
          <Text style={styles.text}>- Account Deletion: If private-media cleanup fails, the account is not deleted; retry the action so cleanup can finish.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.title}>User Generated Content (UGC)</Text>
          <Text style={styles.text}>Users are responsible for their reviews and uploaded photos. Harassment, spam, and fraud are strictly prohibited. Use the report button on any listing to flag inappropriate content.</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.light.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.light.border },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.light.foreground },
  scrollContent: { padding: 20, gap: 24, paddingBottom: 60 },
  section: { backgroundColor: colors.light.card, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.light.border },
  title: { fontSize: 16, fontWeight: '800', color: colors.light.foreground, marginBottom: 12 },
  text: { color: colors.light.mutedForeground, fontSize: 14, lineHeight: 22, marginBottom: 8 },
});
