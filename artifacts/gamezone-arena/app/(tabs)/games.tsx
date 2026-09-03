import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@/components/Feather";
import { useRouter } from "expo-router";
import { AdBannerPlaceholder } from "@/components/AdBannerPlaceholder";

type GameItem = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  route?: string;
  available: boolean;
};

const GAME_LIST: GameItem[] = [
  {
    id: "ludo",
    title: "LUDO GAME",
    description: "Classic multiplayer Ludo",
    icon: "circle",
    color: "#2563EB",
    route: "/games/ludo",
    available: true,
  },
  {
    id: "quick-quiz",
    title: "QUICK QUIZ",
    description: "Test your knowledge",
    icon: "help-circle",
    color: "#8B5CF6",
    route: "/games/quick-quiz",
    available: true,
  },
  {
    id: "memory",
    title: "MEMORY MATCH",
    description: "Train your memory",
    icon: "grid",
    color: "#10B981",
    available: false,
  },
  {
    id: "reaction",
    title: "REACTION TEST",
    description: "How fast can you react?",
    icon: "zap",
    color: "#F59E0B",
    available: false,
  },
  {
    id: "math",
    title: "MATH CHALLENGE",
    description: "Solve problems quickly",
    icon: "hash",
    color: "#EF4444",
    available: false,
  },
  {
    id: "carrom",
    title: "CARROM",
    description: "Classic board game",
    icon: "disc",
    color: "#06B6D4",
    available: false,
  },
];

export default function GamesScreen() {
  const router = useRouter();

  const openGame = (game: GameItem) => {
    if (!game.available || !game.route) {
      return;
    }

    router.push(game.route as any);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>GAMEZONE ARENA</Text>
            <Text style={styles.title}>Games</Text>
            <Text style={styles.subtitle}>
              Choose a game and start playing.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Feather name="play" size={24} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.featuredContainer}>
          <Pressable
            onPress={() => router.push("/games/ludo" as any)}
            style={({ pressed }) => [
              styles.featuredCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.featuredIcon}>
              <Feather name="circle" size={38} color="#FFFFFF" />
            </View>

            <View style={styles.featuredText}>
              <Text style={styles.featuredLabel}>FEATURED GAME</Text>
              <Text style={styles.featuredTitle}>LUDO GAME</Text>
              <Text style={styles.featuredDescription}>
                Classic Ludo with movable tokens, dice, safe stars and
                four players.
              </Text>

              <View style={styles.playRow}>
                <Text style={styles.playText}>PLAY NOW</Text>
                <Feather
                  name="arrow-right"
                  size={18}
                  color="#FFFFFF"
                />
              </View>
            </View>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ALL GAMES</Text>
          <Text style={styles.gameCount}>{GAME_LIST.length} GAMES</Text>
        </View>

        <View style={styles.grid}>
          {GAME_LIST.map((game) => (
            <Pressable
              key={game.id}
              onPress={() => openGame(game)}
              disabled={!game.available}
              style={({ pressed }) => [
                styles.gameCard,
                pressed && game.available && styles.pressed,
                !game.available && styles.disabledCard,
              ]}
            >
              <View
                style={[
                  styles.gameIcon,
                  { backgroundColor: game.color },
                ]}
              >
                <Feather
                  name={game.icon}
                  size={26}
                  color="#FFFFFF"
                />
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{game.title}</Text>

                <Text style={styles.cardDescription}>
                  {game.description}
                </Text>

                {game.available ? (
                  <View style={styles.availableRow}>
                    <View style={styles.availableDot} />
                    <Text style={styles.availableText}>PLAY</Text>
                  </View>
                ) : (
                  <Text style={styles.comingSoon}>COMING SOON</Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>

        <AdBannerPlaceholder placement="games" />

        <View style={styles.infoBox}>
          <View style={styles.infoIcon}>
            <Feather
              name="info"
              size={20}
              color="#38BDF8"
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>More games are coming</Text>
            <Text style={styles.infoText}>
              New games, challenges and multiplayer modes will be added
              to Gamezone Arena.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            GAMEZONE ARENA
          </Text>
          <Text style={styles.footerSubtext}>
            Play sharp. Rise fast.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#070A12",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 120,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },

  eyebrow: {
    color: "#38D9FF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 6,
  },

  title: {
    color: "#F8FAFC",
    fontSize: 34,
    fontWeight: "900",
  },

  subtitle: {
    color: "#8994AD",
    fontSize: 14,
    marginTop: 5,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#17213A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#263454",
  },

  featuredContainer: {
    marginBottom: 28,
  },

  featuredCard: {
    minHeight: 190,
    borderRadius: 24,
    padding: 20,
    backgroundColor: "#173F78",
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2B5D9D",
  },

  featuredIcon: {
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: "#0F2F5C",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  featuredText: {
    flex: 1,
  },

  featuredLabel: {
    color: "#67E8F9",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  featuredTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
  },

  featuredDescription: {
    color: "#C9D7ED",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  playRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  playText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    marginRight: 7,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1,
  },

  gameCount: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "800",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  gameCard: {
    width: "48.2%",
    minHeight: 190,
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#202A3E",
  },

  disabledCard: {
    opacity: 0.55,
  },

  gameIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  cardBody: {
    flex: 1,
  },

  cardTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 6,
  },

  cardDescription: {
    color: "#8994AD",
    fontSize: 12,
    lineHeight: 17,
    minHeight: 35,
  },

  availableRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },

  availableDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    marginRight: 6,
  },

  availableText: {
    color: "#22C55E",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  comingSoon: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 14,
  },

  infoBox: {
    flexDirection: "row",
    backgroundColor: "#0D1424",
    borderRadius: 18,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#1D2A40",
  },

  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#10253A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },

  infoText: {
    color: "#74819A",
    fontSize: 12,
    lineHeight: 18,
  },

  footer: {
    alignItems: "center",
    marginTop: 32,
  },

  footerText: {
    color: "#38D9FF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
  },

  footerSubtext: {
    color: "#4B556B",
    fontSize: 11,
    marginTop: 5,
  },

  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});