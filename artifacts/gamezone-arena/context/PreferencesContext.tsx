import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { configureNotificationChannels, getNotificationPermission, requestNotificationPermission, setNotificationPresentationPreferences } from '@/services/NotificationService';

export type Appearance = 'dark' | 'light' | 'system';
export type Language = 'en' | 'hi';

export type Preferences = {
  appearance: Appearance;
  language: Language;
  notificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  gameNotifications: boolean;
  businessNotifications: boolean;
  notificationSound: boolean;
  masterSound: boolean;
  gameSound: boolean;
  uiSound: boolean;
  musicEnabled: boolean;
  volume: number;
  masterHaptics: boolean;
  gameHaptics: boolean;
  uiHaptics: boolean;
  importantHaptics: boolean;
};

const STORAGE_KEY = '@gamezone/preferences/v1';

export const defaultPreferences: Preferences = {
  appearance: 'dark',
  language: 'en',
  notificationsEnabled: true,
  pushNotificationsEnabled: false,
  gameNotifications: true,
  businessNotifications: true,
  notificationSound: true,
  masterSound: true,
  gameSound: true,
  uiSound: true,
  musicEnabled: true,
  volume: 1,
  masterHaptics: true,
  gameHaptics: true,
  uiHaptics: true,
  importantHaptics: true,
};

type PreferencesContextValue = {
  preferences: Preferences;
  isReady: boolean;
  updatePreferences: (updates: Partial<Preferences>) => Promise<void>;
  resetPreferences: () => Promise<void>;
  canPlayGameSound: boolean;
  canUseGameHaptics: boolean;
  canUseUiHaptics: boolean;
  provideUiHaptic: () => void;
  notificationPermissionGranted: boolean;
  setPushNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
  showInAppNotification: (category: 'general' | 'game' | 'business', message: string) => void;
};

const PreferencesContext = React.createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: React.PropsWithChildren) {
  const [preferences, setPreferences] = React.useState<Preferences>(defaultPreferences);
  const [isReady, setIsReady] = React.useState(false);
  const [notificationPermissionGranted, setNotificationPermissionGranted] = React.useState(false);
  const [inAppNotification, setInAppNotification] = React.useState<{ category: 'general' | 'game' | 'business'; message: string } | null>(null);
  const dismissTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        const parsed = JSON.parse(stored) as Partial<Preferences>;
        setPreferences({ ...defaultPreferences, ...parsed });
      })
      .catch((error: unknown) => {
        if (__DEV__) console.warn('Preferences could not be loaded.', error);
      })
      .finally(() => setIsReady(true));
  }, []);

  React.useEffect(() => {
    // Checking is non-invasive; permission is only requested from Settings.
    void getNotificationPermission().then(setNotificationPermissionGranted).catch(() => undefined);
  }, []);

  React.useEffect(() => {
    if (!isReady) return;
    setNotificationPresentationPreferences(preferences.notificationsEnabled, preferences.notificationSound);
    void configureNotificationChannels(
      preferences.masterSound && preferences.notificationSound,
      preferences.masterHaptics && preferences.importantHaptics,
    ).catch(() => undefined);
  }, [isReady, preferences.importantHaptics, preferences.masterHaptics, preferences.masterSound, preferences.notificationSound, preferences.notificationsEnabled]);

  const persist = React.useCallback(async (next: Preferences) => {
    setPreferences(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      if (__DEV__) console.warn('Preferences could not be saved.', error);
      throw error;
    }
  }, []);

  const updatePreferences = React.useCallback(
    (updates: Partial<Preferences>) => persist({ ...preferences, ...updates }),
    [persist, preferences],
  );
  const resetPreferences = React.useCallback(
    () => persist(defaultPreferences),
    [persist],
  );

  const provideUiHaptic = React.useCallback(() => {
    if (!preferences.masterHaptics || !preferences.uiHaptics) return;
    void Haptics.selectionAsync().catch(() => undefined);
  }, [preferences.masterHaptics, preferences.uiHaptics]);

  const setPushNotificationsEnabled = React.useCallback(async (enabled: boolean) => {
    if (!enabled) {
      await updatePreferences({ pushNotificationsEnabled: false });
      return false;
    }
    const granted = await requestNotificationPermission(
      preferences.masterSound && preferences.notificationSound,
      preferences.masterHaptics && preferences.importantHaptics,
    );
    setNotificationPermissionGranted(granted);
    await updatePreferences({ pushNotificationsEnabled: granted });
    return granted;
  }, [preferences.importantHaptics, preferences.masterHaptics, preferences.masterSound, preferences.notificationSound, updatePreferences]);

  const showInAppNotification = React.useCallback((category: 'general' | 'game' | 'business', message: string) => {
    const allowed = preferences.notificationsEnabled &&
      (category !== 'game' || preferences.gameNotifications) &&
      (category !== 'business' || preferences.businessNotifications);
    if (!allowed) return;
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setInAppNotification({ category, message });
    dismissTimer.current = setTimeout(() => setInAppNotification(null), 5000);
  }, [preferences.businessNotifications, preferences.gameNotifications, preferences.notificationsEnabled]);

  const value = React.useMemo<PreferencesContextValue>(() => ({
    preferences,
    isReady,
    updatePreferences,
    resetPreferences,
    canPlayGameSound: preferences.masterSound && preferences.gameSound,
    canUseGameHaptics: preferences.masterHaptics && preferences.gameHaptics,
    canUseUiHaptics: preferences.masterHaptics && preferences.uiHaptics,
    provideUiHaptic,
    notificationPermissionGranted,
    setPushNotificationsEnabled,
    showInAppNotification,
  }), [isReady, notificationPermissionGranted, preferences, provideUiHaptic, resetPreferences, setPushNotificationsEnabled, showInAppNotification, updatePreferences]);

  return <PreferencesContext.Provider value={value}>
    {children}
    {inAppNotification ? <View pointerEvents="box-none" style={styles.notificationLayer}>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={() => setInAppNotification(null)} style={styles.notificationBanner}>
        <Text style={styles.notificationTitle}>{inAppNotification.category.toUpperCase()}</Text>
        <Text style={styles.notificationMessage}>{inAppNotification.message}</Text>
      </Pressable>
    </View> : null}
  </PreferencesContext.Provider>;
}

const styles = StyleSheet.create({
  notificationLayer: { position: 'absolute', top: 54, left: 16, right: 16, zIndex: 1000 },
  notificationBanner: { backgroundColor: '#111C34', borderColor: '#43DDF8', borderWidth: 1, borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 7 },
  notificationTitle: { color: '#43DDF8', fontWeight: '900', fontSize: 10, letterSpacing: 1 },
  notificationMessage: { color: '#FFF', marginTop: 3, fontSize: 14, fontWeight: '700' },
});

export function usePreferences() {
  const value = React.useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences must be used inside PreferencesProvider.');
  return value;
}