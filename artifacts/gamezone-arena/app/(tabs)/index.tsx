import { Feather } from '@/components/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { type Href } from 'expo-router';

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen, SectionHeader } from '@/components/Screen';
import { GameCard } from '@/components/GameCard';
import { AdBannerPlaceholder } from '@/components/AdBannerPlaceholder';
import colors from '@/constants/colors';
import { games } from '@/constants/config';
import { useAppSession } from '@/context/AppSessionContext';

export default function HomeScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();

  const { progress } = useAppSession();

  const displayName =
    user?.firstName ||
    user?.fullName ||
    'PLAYER';

  const level =
    progress.xp >= 700
      ? 5
      : progress.xp >= 450
      ? 4
      : progress.xp >= 250
      ? 3
      : progress.xp >= 100
      ? 2
      : 1;

  const levelStart =
    [0, 100, 250, 450, 700][level - 1];

  const nextLevel =
    [100, 250, 450, 700, 1000][level - 1];

  const levelPercent =
    nextLevel === levelStart
      ? 100
      : Math.min(
          100,
          Math.round(
            ((progress.xp - levelStart) /
              (nextLevel - levelStart)) *
              100
          )
        );

  async function handleLogout() {
    try {
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch (error) {
      console.log('Logout error:', error);
    }
  }

  function openProfile() {
    router.push('/profile' as Href);
  }

  /* =====================================================
     GAME NAVIGATION
  ===================================================== */

  function openLudo() {
    router.push('/games/ludo' as Href);
  }

  function openQuickQuiz() {
    router.push('/games/quick-quiz' as Href);
  }

  return (
    <Screen>
      {/* =================================================
          HEADER
      ================================================= */}

      <View style={styles.header}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayName
                .slice(0, 1)
                .toUpperCase()}
            </Text>
          </View>

          <View>
            <Text style={styles.greeting}>
              GOOD EVENING
            </Text>

            <Text style={styles.name}>
              {displayName}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <Pressable style={styles.iconButton}>
            <Feather
              name="bell"
              size={19}
              color={colors.light.foreground}
            />

            <View style={styles.notificationDot} />
          </Pressable>

          <Pressable style={styles.iconButton}>
            <Feather
              name="settings"
              size={19}
              color={colors.light.foreground}
            />
          </Pressable>
        </View>
      </View>

      {/* =================================================
          PROFILE + LOGOUT
      ================================================= */}

      <View style={styles.accountActions}>
        <Pressable
          onPress={openProfile}
          style={styles.profileButton}
        >
          <Feather
            name="user"
            size={18}
            color="#FFFFFF"
          />

          <Text style={styles.profileText}>
            PROFILE
          </Text>
        </Pressable>

        <Pressable
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          <Feather
            name="log-out"
            size={18}
            color="#FFFFFF"
          />

          <Text style={styles.logoutText}>
            LOG OUT
          </Text>
        </Pressable>
      </View>

      {/* =================================================
          PLAYER LEVEL
      ================================================= */}

      <LinearGradient
        colors={[
          '#1B4F85',
          '#35215F',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View>
          <Text style={styles.heroEyebrow}>
            PLAYER LEVEL{' '}
            {String(level).padStart(2, '0')}
          </Text>

          <Text style={styles.heroTitle}>
            Ready for your next run?
          </Text>

          <Text style={styles.heroMeta}>
            {progress.xp.toLocaleString()} /{' '}
            {nextLevel.toLocaleString()} XP
            {' '}to level{' '}
            {String(
              Math.min(level + 1, 6)
            ).padStart(2, '0')}
          </Text>
        </View>

        <View style={styles.levelOrb}>
          <Text style={styles.levelNumber}>
            {String(level).padStart(2, '0')}
          </Text>

          <Text style={styles.levelLabel}>
            LVL
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${levelPercent}%`,
              },
            ]}
          />
        </View>
      </LinearGradient>

      {/* =================================================
          STATS
      ================================================= */}

      <View style={styles.stats}>
        <Stat
          icon="zap"
          value={progress.xp.toLocaleString()}
          label="TOTAL XP"
          color={colors.light.primary}
        />

        <Stat
          icon="circle"
          value={progress.coins.toLocaleString()}
          label="COINS"
          color={colors.light.accent}
        />

        <Stat
          icon="award"
          value={progress.wins.toString()}
          label="WINS"
          color="#7CF2B2"
        />
      </View>

      <SectionHeader
        title="Business & Services"
        action="Explore"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontal}
      >
        <Pressable
          style={styles.businessCard}
          onPress={() => router.push('/(tabs)/business' as Href)}
        >
          <View style={styles.businessIcon}>
            <Feather name="map-pin" size={24} color="#C66BFF" />
          </View>
          <Text style={styles.businessTitle}>Local Directory</Text>
          <Text style={styles.businessDesc}>Find trusted shops & services near you</Text>
        </Pressable>
      </ScrollView>

      {/* =================================================
          CONTINUE PLAYING
      ================================================= */}

      <SectionHeader
        title="Continue playing"
        action="See all"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontal}
      >
        {/* ================= LUDO ================= */}

        <GameCard
          game={games[5]}
          onPress={openLudo}
        />

        {/* ================= QUICK QUIZ ================= */}

        <GameCard
          game={games[0]}
          onPress={openQuickQuiz}
        />
      </ScrollView>

      <AdBannerPlaceholder placement="home" />

      {/* =================================================
          DAILY CHALLENGE
      ================================================= */}

      <SectionHeader
        title="Daily challenge"
        action="18h left"
      />

      <View style={styles.challenge}>
        <View style={styles.challengeIcon}>
          <Feather
            name="target"
            size={20}
            color={colors.light.primary}
          />
        </View>

        <View style={styles.challengeCopy}>
          <Text style={styles.challengeTitle}>
            Stack your streak
          </Text>

          <Text style={styles.challengeText}>
            Play 3 games today
          </Text>

          <View style={styles.challengeProgress}>
            <View
              style={[
                styles.challengeFill,
                {
                  width: `${Math.min(
                    100,
                    Math.round(
                      (progress.dailyChallengeGames /
                        3) *
                        100
                    )
                  )}%`,
                },
              ]}
            />
          </View>

          <Text style={styles.challengeMeta}>
            {progress.dailyChallengeGames} of 3
            completed
          </Text>
        </View>

        <View style={styles.reward}>
          <Feather
            name="circle"
            size={13}
            color={colors.light.accent}
          />

          <Text style={styles.rewardText}>
            +80
          </Text>
        </View>
      </View>

      {/* =================================================
          ARENA PULSE
      ================================================= */}

      <SectionHeader
        title="Arena pulse"
        action="View leaderboard"
      />

      <View style={styles.rankCard}>
        <View style={styles.rankPosition}>
          <Text style={styles.rankNumber}>
            #04
          </Text>

          <Text style={styles.rankCaption}>
            THIS WEEK
          </Text>
        </View>

        <View style={styles.rankLine}>
          <View
            style={[
              styles.miniAvatar,
              {
                backgroundColor:
                  '#FFB45E',
              },
            ]}
          />

          <View
            style={[
              styles.miniAvatar,
              {
                backgroundColor:
                  colors.light.accent,
                marginLeft: -8,
              },
            ]}
          />

          <View
            style={[
              styles.miniAvatar,
              {
                backgroundColor:
                  colors.light.primary,
                marginLeft: -8,
              },
            ]}
          />

          <Text style={styles.rankCopy}>
            You’re 120 XP from the podium.
          </Text>
        </View>

        <Feather
          name="chevron-right"
          size={20}
          color={colors.light.mutedForeground}
        />
      </View>
    </Screen>
  );
}

/* =========================================================
   STAT
========================================================= */

function Stat({
  icon,
  value,
  label,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.stat}>
      <Feather
        name={icon}
        size={15}
        color={color}
      />

      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor:
      colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color:
      colors.light.primaryForeground,
    fontSize: 18,
    fontWeight: '900',
  },

  greeting: {
    color:
      colors.light.mutedForeground,
    fontSize: 9,
    letterSpacing: 1.6,
    fontWeight: '800',
  },

  name: {
    color:
      colors.light.foreground,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },

  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },

  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor:
      colors.light.card,
    borderWidth: 1,
    borderColor:
      colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor:
      colors.light.accent,
    right: 8,
    top: 7,
  },

  accountActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 14,
  },

  profileButton: {
    flex: 1,
    height: 48,
    borderRadius: 15,
    backgroundColor:
      colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  profileText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  logoutButton: {
    flex: 1,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#EF3340',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  logoutText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  hero: {
    minHeight: 178,
    borderRadius: 25,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#31517A',
  },

  heroEyebrow: {
    color: colors.light.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.7,
  },

  heroTitle: {
    color: colors.light.foreground,
    fontSize: 23,
    fontWeight: '800',
    maxWidth: 210,
    lineHeight: 28,
    marginTop: 9,
  },

  heroMeta: {
    color: colors.light.mutedForeground,
    fontSize: 11,
    marginTop: 10,
  },

  levelOrb: {
    position: 'absolute',
    right: 18,
    top: 24,
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1,
    borderColor:
      colors.light.primary + '75',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      colors.light.background + '60',
  },

  levelNumber: {
    color: colors.light.foreground,
    fontSize: 20,
    fontWeight: '900',
  },

  levelLabel: {
    color: colors.light.primary,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },

  progressTrack: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#274063',
  },

  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor:
      colors.light.primary,
  },

  stats: {
    flexDirection: 'row',
    backgroundColor:
      colors.light.card,
    borderRadius: 20,
    borderWidth: 2,
    borderColor:
      colors.light.border,
    paddingVertical: 15,
  },

  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    borderRightWidth: 1,
    borderRightColor:
      colors.light.border,
  },

  statValue: {
    color:
      colors.light.foreground,
    fontSize: 17,
    fontWeight: '800',
  },

  statLabel: {
    color:
      colors.light.mutedForeground,
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '700',
  },

  horizontal: {
    gap: 12,
    paddingRight: 20,
  },

  challenge: {
    minHeight: 104,
    backgroundColor:
      colors.light.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor:
      colors.light.border,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  challengeIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor:
      colors.light.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },

  challengeCopy: {
    flex: 1,
  },

  challengeTitle: {
    color:
      colors.light.foreground,
    fontSize: 14,
    fontWeight: '800',
  },

  challengeText: {
    color:
      colors.light.mutedForeground,
    fontSize: 12,
    marginTop: 3,
  },

  challengeProgress: {
    height: 4,
    backgroundColor:
      colors.light.muted,
    borderRadius: 2,
    marginTop: 9,
  },

  challengeFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor:
      colors.light.primary,
  },

  challengeMeta: {
    color:
      colors.light.mutedForeground,
    fontSize: 9,
    marginTop: 5,
  },

  reward: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  rewardText: {
    color:
      colors.light.accent,
    fontSize: 12,
    fontWeight: '800',
  },

  rankCard: {
    minHeight: 84,
    borderRadius: 20,
    borderWidth: 1,
    borderColor:
      colors.light.border,
    backgroundColor:
      colors.light.card,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  rankPosition: {
    paddingRight: 14,
    borderRightWidth: 1,
    borderRightColor:
      colors.light.border,
  },

  rankNumber: {
    color:
      colors.light.primary,
    fontSize: 20,
    fontWeight: '900',
  },

  rankCaption: {
    color:
      colors.light.mutedForeground,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 3,
  },

  rankLine: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  miniAvatar: {
    width: 26,
    height: 26,
    borderRadius: 10,
    borderWidth: 2,
    borderColor:
      colors.light.card,
  },

  rankCopy: {
    color:
      colors.light.secondaryForeground,
    fontSize: 11,
    lineHeight: 16,
    marginLeft: 9,
    flex: 1,
  },

  businessCard: {
    width: 250,
    minHeight: 160,
    backgroundColor: '#30205B',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#A878FF',
    padding: 18,
    marginBottom: 20,
  },

  businessIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#C66BFF38',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  businessTitle: {
    color: colors.light.foreground,
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 4,
  },

  businessDesc: {
    color: colors.light.secondaryForeground,
    fontSize: 13,
    lineHeight: 19,
  }
});