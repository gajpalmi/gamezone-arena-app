import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export type NotificationCategory = 'general' | 'game' | 'business' | 'jobs';

const CHANNELS: Record<NotificationCategory, string> = {
  general: 'general',
  game: 'game-updates',
  business: 'business-activity',
  jobs: 'jobs-hiring',
};

let presentationPreferences = { enabled: true, soundEnabled: true };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: presentationPreferences.enabled,
    shouldShowList: presentationPreferences.enabled,
    shouldPlaySound: presentationPreferences.enabled && presentationPreferences.soundEnabled,
    shouldSetBadge: false,
  }),
});

export async function configureNotificationChannels(soundEnabled: boolean, vibrationEnabled: boolean) {
  if (Platform.OS !== 'android') return;
  await Promise.all((Object.entries(CHANNELS) as Array<[NotificationCategory, string]>).map(
    ([category, id]) => Notifications.setNotificationChannelAsync(id, {
      name: category === 'game' ? 'Game updates' : category === 'business' ? 'Business activity' : category === 'jobs' ? 'Jobs & Hiring' : 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: soundEnabled ? 'default' : undefined,
      vibrationPattern: vibrationEnabled ? [0, 180] : undefined,
      enableVibrate: vibrationEnabled,
    }),
  ));
}

export function setNotificationPresentationPreferences(enabled: boolean, soundEnabled: boolean) {
  presentationPreferences = { enabled, soundEnabled };
}

export async function getNotificationPermission() {
  const permissions = await Notifications.getPermissionsAsync();
  return permissions.granted;
}

export async function requestNotificationPermission(soundEnabled: boolean, vibrationEnabled: boolean) {
  await configureNotificationChannels(soundEnabled, vibrationEnabled);
  const permissions = await Notifications.requestPermissionsAsync();
  return permissions.granted;
}

export async function sendLocalPreferenceTest(category: NotificationCategory, soundEnabled: boolean, vibrationEnabled: boolean) {
  await configureNotificationChannels(soundEnabled, vibrationEnabled);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'GAMEZONE ARENA',
      body: `This is a ${category} notification preference test.`,
      sound: soundEnabled ? 'default' : undefined,
    },
    trigger: Platform.OS === 'android' ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: CHANNELS[category] } : null,
  });
}