import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';

export const appLink = 'gamezone-arena://';
export const gameLink = (game: 'ludo' | 'quick-quiz') => `gamezone-arena://games/${game}`;
export const businessLink = (id: string) => `gamezone-arena://business/${id}`;

export async function copyLink(link: string) {
  await Clipboard.setStringAsync(link);
}

export async function shareLink(title: string, message: string) {
  return Share.share({ title, message });
}