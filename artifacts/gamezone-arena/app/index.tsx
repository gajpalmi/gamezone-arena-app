import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, type Href, useRouter } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppSession } from '@/context/AppSessionContext';
import colors from '@/constants/colors';
import { appConfig } from '@/constants/config';
import { BrandMark } from '@/components/BrandMark';

const introSlides = [
  { eyebrow: 'BUILT FOR SKILL', title: 'Your next high score is waiting.', body: 'Compete in quick, satisfying challenges designed to reward focus, speed, and clever thinking.', icon: 'target' as const },
  { eyebrow: 'PROGRESS THAT FEELS GOOD', title: 'Level up every time you play.', body: 'Earn XP, unlock badges, and build a profile that shows exactly how you play.', icon: 'trending-up' as const },
  { eyebrow: 'YOUR ARENA, YOUR CREW', title: 'Find your place on the board.', body: 'Climb weekly ranks, discover new games, and connect with players who match your energy.', icon: 'users' as const },
];

export default function Index() {
  const { isSignedIn } = useAuth();
  const { ready, hasSeenIntro, completeIntro } = useAppSession();
  const router = useRouter();
  const [slide, setSlide] = useState(0);

  if (!ready) return <View style={styles.loading}><ActivityIndicator color={colors.light.primary} /></View>;
  if (isSignedIn) return <Redirect href="/(tabs)" />;

  const current = introSlides[slide];
  const isLast = slide === introSlides.length - 1;

  return (
    <LinearGradient colors={[colors.light.background, '#0C1020', '#11152A']} style={styles.root}>
      <View style={styles.top}><BrandMark compact /><Text style={styles.version}>SEASON 01</Text></View>
      <View style={styles.hero}>
        <View style={styles.orbit}><View style={styles.orbitInner}><Image source={require('@/assets/images/icon.png')} style={styles.logo} /></View></View>
        {!hasSeenIntro ? (
          <>
            <Text style={styles.eyebrow}>{current.eyebrow}</Text>
            <Text style={styles.title}>{current.title}</Text>
            <Text style={styles.body}>{current.body}</Text>
            <View style={styles.iconRow}><Feather name={current.icon} size={20} color={colors.light.primary} /><View style={styles.dots}>{introSlides.map((_, index) => <View key={index} style={[styles.dot, index === slide && styles.dotActive]} />)}</View></View>
          </>
        ) : (
          <>
            <Text style={styles.eyebrow}>WELCOME BACK, PLAYER</Text>
            <Text style={styles.title}>The arena is open.</Text>
            <Text style={styles.body}>Sign in to keep your progress, or create a profile and start your run.</Text>
          </>
        )}
      </View>
      <View style={styles.actions}>
        {!hasSeenIntro ? (
          <Pressable testID="intro-next" onPress={async () => { if (isLast) await completeIntro(); else setSlide((value) => value + 1); }} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>{isLast ? 'Enter the arena' : 'Continue'}</Text><Feather name="arrow-right" size={18} color={colors.light.primaryForeground} />
          </Pressable>
        ) : (
          <>
            <Pressable testID="sign-up" onPress={() => router.push('/sign-up' as Href)} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}><Text style={styles.primaryText}>Create player profile</Text><Feather name="arrow-right" size={18} color={colors.light.primaryForeground} /></Pressable>
            <Pressable testID="sign-in" onPress={() => router.push('/sign-in' as Href)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}><Text style={styles.secondaryText}>I already have an account</Text></Pressable>
          </>
        )}
        <Text style={styles.legal}>{appConfig.legalNotice}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  loading: { flex: 1, backgroundColor: colors.light.background, alignItems: 'center', justifyContent: 'center' },
  top: { paddingTop: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  version: { color: colors.light.mutedForeground, fontSize: 10, fontWeight: '800', letterSpacing: 1.7 },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 20 },
  orbit: { width: 190, height: 190, borderRadius: 95, borderWidth: 1, borderColor: colors.light.primary + '35', alignItems: 'center', justifyContent: 'center', marginBottom: 46 },
  orbitInner: { width: 126, height: 126, borderRadius: 38, backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '8deg' }] },
  logo: { width: 104, height: 104, borderRadius: 32, transform: [{ rotate: '-8deg' }] },
  eyebrow: { color: colors.light.primary, fontSize: 11, fontWeight: '800', letterSpacing: 2.2, textAlign: 'center' },
  title: { color: colors.light.foreground, fontSize: 35, fontWeight: '800', lineHeight: 42, textAlign: 'center', marginTop: 15, maxWidth: 340 },
  body: { color: colors.light.mutedForeground, fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 14, maxWidth: 335 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 26 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { height: 5, width: 5, borderRadius: 3, backgroundColor: colors.light.border },
  dotActive: { width: 22, backgroundColor: colors.light.primary },
  actions: { paddingBottom: 28, gap: 12 },
  primaryButton: { minHeight: 56, borderRadius: 18, backgroundColor: colors.light.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  primaryText: { color: colors.light.primaryForeground, fontSize: 15, fontWeight: '800' },
  secondaryButton: { minHeight: 52, borderRadius: 17, backgroundColor: colors.light.secondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.light.border },
  secondaryText: { color: colors.light.secondaryForeground, fontSize: 14, fontWeight: '700' },
  legal: { color: colors.light.mutedForeground, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 2 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});