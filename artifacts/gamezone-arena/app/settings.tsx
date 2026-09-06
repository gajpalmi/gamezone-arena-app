import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@/components/Feather';
import { type Appearance, type Language, usePreferences } from '@/context/PreferencesContext';
import { copyLink, appLink, gameLink, shareLink } from '@/lib/share';
import { sendLocalPreferenceTest, type NotificationCategory } from '@/services/NotificationService';

const SUPPORT_URL = 'mailto:support@gamezone-arena.app?subject=GAMEZONE%20ARENA%20Support';

function ToggleRow({ label, detail, value, onChange }: {
  label: string; detail?: string; value: boolean; onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: '#304162', true: '#177B91' }} thumbColor={value ? '#43DDF8' : '#A7B1C5'} />
    </View>
  );
}

function ChoiceRow<T extends string>({ label, options, value, onChange }: {
  label: string; options: readonly T[]; value: T; onChange: (value: T) => void;
}) {
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><View style={styles.choices}>{options.map((option) => (
    <Pressable key={option} onPress={() => onChange(option)} style={[styles.choice, value === option && styles.choiceSelected]}>
      <Text style={[styles.choiceText, value === option && styles.choiceTextSelected]}>{option.toUpperCase()}</Text>
    </Pressable>
  ))}</View></View>;
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { preferences, updatePreferences, resetPreferences, notificationPermissionGranted, setPushNotificationsEnabled, showInAppNotification } = usePreferences();
  const update = (changes: Partial<typeof preferences>) => { void updatePreferences(changes).catch(() => Alert.alert('Could not save', 'Please try again.')); };
  const open = (url: string) => { void Linking.openURL(url).catch(() => Alert.alert('Unable to open link', 'No compatible app is available.')); };
  const shareApp = () => {
    void shareLink('GAMEZONE ARENA', `Play and discover local businesses with GAMEZONE ARENA: ${appLink}`).catch(() => Alert.alert('Share unavailable', 'Your device could not open the share sheet.'));
  };
  const copy = (link: string) => void copyLink(link).then(() => Alert.alert('Link copied', 'The GAMEZONE ARENA link is ready to paste.')).catch(() => Alert.alert('Copy unavailable', 'Your device could not copy this link.'));
  const shareGame = () => Alert.alert('Share a game', 'Choose a game to share.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Ludo', onPress: () => void shareLink('Play Ludo', `Join me for Ludo on GAMEZONE ARENA: ${gameLink('ludo')}`) },
    { text: 'Quick Quiz', onPress: () => void shareLink('Play Quick Quiz', `Play Quick Quiz on GAMEZONE ARENA: ${gameLink('quick-quiz')}`) },
  ]);
  const copyGame = () => Alert.alert('Copy a game link', 'Choose a game.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Ludo', onPress: () => copy(gameLink('ludo')) },
    { text: 'Quick Quiz', onPress: () => copy(gameLink('quick-quiz')) },
  ]);
  const testNotification = (category: NotificationCategory) => {
    const categoryEnabled = category === 'game' ? preferences.gameNotifications : category === 'business' ? preferences.businessNotifications : category === 'jobs' ? preferences.jobsNotifications : true;
    if (!preferences.notificationsEnabled || !categoryEnabled) {
      Alert.alert('Notifications are off', `Enable in-app and ${category === 'general' ? 'general' : category} notifications first.`);
      return;
    }
    if (!preferences.pushNotificationsEnabled || !notificationPermissionGranted) {
      Alert.alert('Push notifications are off', 'Enable push notifications first to send a local test.');
      return;
    }
    void sendLocalPreferenceTest(
      category,
      preferences.masterSound && preferences.notificationSound,
      preferences.masterHaptics && preferences.importantHaptics,
    ).then(() => Alert.alert('Test scheduled', 'A local notification will appear shortly.')).catch(() => Alert.alert('Test unavailable', 'Your device could not schedule the notification.'));
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><Feather name="arrow-left" size={20} color="#FFF" /></Pressable>
        <Text style={styles.title}>SETTINGS</Text><View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>APPEARANCE & LANGUAGE</Text>
        <View style={styles.card}>
          <ChoiceRow<Appearance> label="Appearance" options={['dark', 'light', 'system']} value={preferences.appearance} onChange={(appearance) => update({ appearance })} />
          <ChoiceRow<Language> label="Language" options={['en', 'hi']} value={preferences.language} onChange={(language) => update({ language })} />
          <Text style={styles.note}>These choices are saved for future translated and themed screens. Existing screens remain in their current language and dark visual design.</Text>
        </View>

        <Text style={styles.section}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          <ToggleRow label="In-app notifications" detail="Control alerts shown inside GAMEZONE ARENA." value={preferences.notificationsEnabled} onChange={(notificationsEnabled) => update({ notificationsEnabled })} />
          <ToggleRow label="Device push notifications" detail={notificationPermissionGranted ? 'Android/iOS permission is granted.' : 'Permission is requested only when you turn this on.'} value={preferences.pushNotificationsEnabled} onChange={(enabled) => void setPushNotificationsEnabled(enabled).then((granted) => { if (enabled && !granted) Alert.alert('Permission not granted', 'You can enable notifications later in your device settings.'); }).catch(() => Alert.alert('Could not update notifications', 'Please try again.'))} />
          <ToggleRow label="Game updates" value={preferences.gameNotifications} onChange={(gameNotifications) => update({ gameNotifications })} />
          <ToggleRow label="Business activity" value={preferences.businessNotifications} onChange={(businessNotifications) => update({ businessNotifications })} />
          <ToggleRow label="Notification sound" value={preferences.notificationSound} onChange={(notificationSound) => update({ notificationSound })} />
          <Pressable style={styles.linkRow} onPress={() => showInAppNotification('general', 'This is an in-app notification preference test.')}><Text style={styles.rowLabel}>Show in-app test notification</Text><Feather name="message-circle" size={18} color="#43DDF8" /></Pressable>
          <Pressable style={styles.linkRow} onPress={() => testNotification('general')}><Text style={styles.rowLabel}>Send a local test notification</Text><Feather name="bell" size={18} color="#43DDF8" /></Pressable>
          <Pressable style={styles.linkRow} onPress={() => testNotification('game')}><Text style={styles.rowLabel}>Test game update channel</Text><Feather name="gamepad" size={18} color="#43DDF8" /></Pressable>
          <Pressable style={styles.linkRow} onPress={() => testNotification('business')}><Text style={styles.rowLabel}>Test business activity channel</Text><Feather name="briefcase" size={18} color="#43DDF8" /></Pressable>
           <Pressable style={styles.linkRow} onPress={() => testNotification('jobs')}><Text style={styles.rowLabel}>Test Jobs &amp; Hiring channel</Text><Feather name="briefcase" size={18} color="#43DDF8" /></Pressable>
           <Text style={styles.note}>No remote push token is registered and no notification data is sent to a server. Android channels are created for general, game, business, and Jobs &amp; Hiring activity.</Text>
        </View>

        <Text style={styles.section}>SOUND</Text>
        <View style={styles.card}>
          <ToggleRow label="All sound" value={preferences.masterSound} onChange={(masterSound) => update({ masterSound })} />
          <ToggleRow label="Game sound effects" value={preferences.gameSound} onChange={(gameSound) => update({ gameSound })} />
          <ToggleRow label="UI sound effects" value={preferences.uiSound} onChange={(uiSound) => update({ uiSound })} />
          <ToggleRow label="Music" value={preferences.musicEnabled} onChange={(musicEnabled) => update({ musicEnabled })} />
          <Text style={styles.rowLabel}>Effects volume: {Math.round(preferences.volume * 100)}%</Text>
          <View style={styles.volume}>{[0.25, 0.5, 0.75, 1].map((value) => <Pressable key={value} onPress={() => update({ volume: value })} style={[styles.volumeStep, preferences.volume >= value && styles.volumeStepActive]} accessibilityLabel={`Set volume to ${value * 100}%`} />)}</View>
          <Text style={styles.note}>Game audio follows this setting. Device silent-mode behavior is controlled by the device; GAMEZONE ARENA does not override it.</Text>
        </View>

        <Text style={styles.section}>HAPTICS</Text>
        <View style={styles.card}>
          <ToggleRow label="All haptics" value={preferences.masterHaptics} onChange={(masterHaptics) => update({ masterHaptics })} />
          <ToggleRow label="Game haptics" value={preferences.gameHaptics} onChange={(gameHaptics) => update({ gameHaptics })} />
          <ToggleRow label="UI haptics" value={preferences.uiHaptics} onChange={(uiHaptics) => update({ uiHaptics })} />
          <ToggleRow label="Important feedback" detail="Win, warning, and success feedback." value={preferences.importantHaptics} onChange={(importantHaptics) => update({ importantHaptics })} />
        </View>

        <Text style={styles.section}>PRIVACY & ACCOUNT</Text>
        <View style={styles.card}>
          <Pressable style={styles.linkRow} onPress={() => router.push('/business/legal')}><Text style={styles.rowLabel}>Legal & privacy policy</Text><Feather name="chevron-right" size={18} color="#71809F" /></Pressable>
          <Pressable style={styles.linkRow} onPress={() => Alert.alert('Delete account', 'Use Delete Account from your Profile to permanently remove your account and associated data.')}><Text style={styles.rowLabel}>Data deletion</Text><Feather name="chevron-right" size={18} color="#71809F" /></Pressable>
          <Pressable style={styles.linkRow} onPress={() => router.push('/forgot-password')}><Text style={styles.rowLabel}>Reset password</Text><Feather name="lock" size={18} color="#43DDF8" /></Pressable>
        </View>

        <Text style={styles.section}>BUSINESS</Text>
        <View style={styles.card}>
          <Pressable style={styles.linkRow} onPress={() => router.push('/business/mine')}><Text style={styles.rowLabel}>My Business</Text><Feather name="chevron-right" size={18} color="#71809F" /></Pressable>
          <Pressable style={styles.linkRow} onPress={() => router.push('/business/offerings-mine')}><Text style={styles.rowLabel}>My Products</Text><Feather name="chevron-right" size={18} color="#71809F" /></Pressable>
          <Pressable style={styles.linkRow} onPress={() => router.push('/business/offerings-mine')}><Text style={styles.rowLabel}>My Services</Text><Feather name="chevron-right" size={18} color="#71809F" /></Pressable>
          <Pressable style={styles.linkRow} onPress={() => router.push('/business/offerings-saved')}><Text style={styles.rowLabel}>Saved listings</Text><Feather name="heart" size={18} color="#43DDF8" /></Pressable>
          <Pressable style={styles.linkRow} onPress={() => router.push('/business/offerings-mine')}><Text style={styles.rowLabel}>Manage listings</Text><Feather name="briefcase" size={18} color="#43DDF8" /></Pressable>
        </View>

        <Text style={styles.section}>JOBS &amp; HIRING</Text>
        <View style={styles.card}>
          <ToggleRow label="Job notifications" detail="Updates about jobs you post, save, or follow." value={preferences.jobsNotifications} onChange={(jobsNotifications) => update({ jobsNotifications })} />
          <ToggleRow label="Application notifications" detail="Application status changes and responses." value={preferences.applicationNotifications} onChange={(applicationNotifications) => update({ applicationNotifications })} />
          <ToggleRow label="Employer messages" detail="Contact and interview messages from employers." value={preferences.employerMessages} onChange={(employerMessages) => update({ employerMessages })} />
          <ToggleRow label="Job match notifications" detail="New jobs that match your profile preferences." value={preferences.jobMatchNotifications} onChange={(jobMatchNotifications) => update({ jobMatchNotifications })} />
          <ToggleRow label="Jobs marketing notifications" value={preferences.jobMarketingNotifications} onChange={(jobMarketingNotifications) => update({ jobMarketingNotifications })} />
          <ToggleRow label="Public professional profile" detail="Only professional profile fields you choose can be shown to employers." value={preferences.jobProfileVisible} onChange={(jobProfileVisible) => update({ jobProfileVisible })} />
          <ToggleRow label="Show contact details" detail="Keep this off to use controlled in-app contact first." value={preferences.jobContactVisible} onChange={(jobContactVisible) => update({ jobContactVisible })} />
          <Pressable style={styles.linkRow} onPress={() => router.push('/business/jobs/settings' as any)}><Text style={styles.rowLabel}>Jobs settings &amp; privacy</Text><Feather name="chevron-right" size={18} color="#71809F" /></Pressable>
          <Pressable style={styles.linkRow} onPress={() => router.push('/business/jobs/help' as any)}><Text style={styles.rowLabel}>Report a jobs problem</Text><Feather name="alert-triangle" size={18} color="#43DDF8" /></Pressable>
          <Text style={styles.note}>Job alerts always respect the master sound, notification sound, and master haptics settings above.</Text>
        </View>

        <Text style={styles.section}>HELP & ABOUT</Text>
        <View style={styles.card}>
          <Pressable style={styles.linkRow} onPress={shareApp}><Text style={styles.rowLabel}>Share GAMEZONE ARENA</Text><Feather name="share-2" size={18} color="#43DDF8" /></Pressable>
          <Pressable style={styles.linkRow} onPress={() => copy(appLink)}><Text style={styles.rowLabel}>Copy app link</Text><Feather name="copy" size={18} color="#43DDF8" /></Pressable>
          <Pressable style={styles.linkRow} onPress={shareGame}><Text style={styles.rowLabel}>Share a game</Text><Feather name="share-2" size={18} color="#43DDF8" /></Pressable>
          <Pressable style={styles.linkRow} onPress={copyGame}><Text style={styles.rowLabel}>Copy a game link</Text><Feather name="copy" size={18} color="#43DDF8" /></Pressable>
          <Pressable style={styles.linkRow} onPress={() => open(SUPPORT_URL)}><Text style={styles.rowLabel}>Help & feedback</Text><Feather name="external-link" size={18} color="#43DDF8" /></Pressable>
          <View style={styles.linkRow}><View><Text style={styles.rowLabel}>GAMEZONE ARENA</Text><Text style={styles.rowDetail}>Version 1.0.0</Text></View></View>
          <Pressable style={styles.reset} onPress={() => Alert.alert('Reset preferences', 'Restore all settings to their defaults?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: () => void resetPreferences().catch(() => Alert.alert('Could not reset preferences', 'Please try again.')) }])}><Text style={styles.resetText}>RESET PREFERENCES</Text></Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050A17' }, header: { height: 58, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, title: { color: '#FFF', fontWeight: '900', fontSize: 19, letterSpacing: 1 }, content: { padding: 20, gap: 10 }, section: { color: '#43DDF8', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginTop: 14 }, card: { backgroundColor: '#111C34', borderWidth: 1, borderColor: '#304162', borderRadius: 16, overflow: 'hidden' }, row: { minHeight: 59, paddingHorizontal: 16, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#304162', gap: 12 }, rowCopy: { flex: 1 }, rowLabel: { color: '#FFF', fontSize: 14, fontWeight: '700' }, rowDetail: { color: '#9AA9C5', fontSize: 12, lineHeight: 17, marginTop: 3 }, choices: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }, choice: { borderColor: '#304162', borderWidth: 1, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 6 }, choiceSelected: { borderColor: '#43DDF8', backgroundColor: '#43DDF820' }, choiceText: { color: '#9AA9C5', fontSize: 10, fontWeight: '800' }, choiceTextSelected: { color: '#43DDF8' }, note: { color: '#71809F', fontSize: 11, lineHeight: 16, padding: 14 }, volume: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, gap: 8 }, volumeStep: { height: 8, flex: 1, backgroundColor: '#304162', borderRadius: 4 }, volumeStepActive: { backgroundColor: '#43DDF8' }, linkRow: { minHeight: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#304162' }, reset: { margin: 16, borderColor: '#EF3340', borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center' }, resetText: { color: '#EF3340', fontSize: 12, fontWeight: '900' },
});