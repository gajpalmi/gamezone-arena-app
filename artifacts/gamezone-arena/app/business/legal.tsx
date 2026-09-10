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
          <Text style={styles.title}>Privacy Policy & Data Retention (version 2026-09-10)</Text>
          <Text style={styles.text}>- Account Data: Authentication is provided by Clerk. We use your account identifier to keep your games, listings, jobs, applications, reports, and saved items associated with your account.</Text>
          <Text style={styles.text}>- Listing and Jobs Data: We collect information you choose to submit, including names, descriptions, categories, location, contact details, service areas, work information, photos, and resume documents.</Text>
          <Text style={styles.text}>- Device Data: Camera, photo library, files, notifications, and precise location are accessed only when you use a feature that needs them and after the device requests permission. Location is used to select listing or job locations.</Text>
          <Text style={styles.text}>- Advertising: Google Mobile Ads may process device identifiers, advertising data, diagnostics, and consent choices to provide and measure ads. The app requests consent where required, limits ads to a G content rating, and provides Settings → Ad Privacy.</Text>
          <Text style={styles.text}>- Data Usage: Approved listing and profile information is displayed according to your visibility and contact-consent choices. Data is also used for game operation, fraud prevention, moderation, reports, and account support.</Text>
          <Text style={styles.text}>- Data Sharing: Data is processed by service providers needed to operate the app, including Clerk for authentication, Supabase for database and private media storage, Google for ads and consent, and Expo for app delivery and notifications. We do not sell personal information.</Text>
          <Text style={styles.text}>- Security: Row-level access controls and owner-scoped operations protect private records. Private photos and documents are delivered through short-lived authorized links where applicable.</Text>
          <Text style={styles.text}>- Retention and Deletion: Content remains while your account or listing is active, subject to moderation and legal requirements. You can delete eligible listings from their owner screens. Account deletion from Profile removes associated app data and private media before the Clerk account is removed.</Text>
          <Text style={styles.text}>- Deletion Safety: If private-media cleanup fails, account deletion stops instead of leaving an incomplete deletion. Retry the action after connectivity is restored.</Text>
          <Text style={styles.text}>- Choices: You can deny optional device permissions, change public contact choices while editing eligible content, reopen ad privacy choices in Settings, and use block/report controls.</Text>
          <Text style={styles.text}>- Contact: Use the developer contact shown on the GAMEZONE ARENA Google Play listing for privacy or deletion questions.</Text>
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
