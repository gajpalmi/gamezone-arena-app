import React from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ResizeMode, Video } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getGetCartoonVideoQueryKey,
  useGetCartoonVideo,
} from "@workspace/api-client-react";
import { Feather } from "@/components/Feather";
import colors from "@/constants/colors";
import { resolveCartoonMediaUrl } from "@/lib/cartoonVideos";

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function CartoonVideoPlayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const videoId = Array.isArray(params.id) ? params.id[0] : params.id ?? "";
  const query = useGetCartoonVideo(videoId, {
    query: {
      queryKey: getGetCartoonVideoQueryKey(videoId),
      enabled: Boolean(videoId),
      refetchOnMount: "always",
    },
  });

  if (query.isLoading) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.stateTitle}>Opening video</Text>
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <Feather name="alert-circle" size={40} color={colors.light.destructive} />
        <Text style={styles.stateTitle}>Video unavailable</Text>
        <Text style={styles.stateText}>
          This video could not be loaded. Please try again.
        </Text>
        <Pressable
          onPress={() => void query.refetch()}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>RETRY</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>GO BACK</Text>
        </Pressable>
      </View>
    );
  }

  const video = query.data;
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 12, 22),
            paddingBottom: Math.max(insets.bottom + 28, 42),
          },
        ]}
      >
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Feather name="arrow-left" size={20} color={colors.light.foreground} />
        </Pressable>

        <Video
          source={{ uri: resolveCartoonMediaUrl(video.videoUrl) }}
          posterSource={{ uri: resolveCartoonMediaUrl(video.thumbnailUrl) }}
          usePoster
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          style={styles.player}
        />

        <Text style={styles.eyebrow}>{video.category.toUpperCase()}</Text>
        <Text style={styles.title}>{video.title}</Text>
        <View style={styles.metaRow}>
          <Feather name="clock" size={14} color={colors.light.mutedForeground} />
          <Text style={styles.metaText}>{formatDuration(video.durationSeconds)}</Text>
        </View>
        <Text style={styles.description}>{video.description}</Text>

        <View style={styles.licenseCard}>
          <Feather name="shield" size={20} color={colors.light.primary} />
          <View style={styles.licenseCopy}>
            <Text style={styles.licenseTitle}>Licensed source</Text>
            <Text style={styles.licenseText}>{video.license}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => void Linking.openURL(resolveCartoonMediaUrl(video.sourceUrl))}
          style={({ pressed }) => [styles.sourceButton, pressed && styles.pressed]}
        >
          <Text style={styles.sourceText}>VIEW ORIGINAL SOURCE</Text>
          <Feather name="external-link" size={16} color={colors.light.primary} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.light.background },
  content: { paddingHorizontal: 18 },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.light.card,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 18,
  },
  player: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 20,
    backgroundColor: "#000000",
  },
  eyebrow: {
    color: colors.light.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.6,
    marginTop: 22,
  },
  title: {
    color: colors.light.foreground,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    marginTop: 6,
  },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 11 },
  metaText: {
    color: colors.light.mutedForeground,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  description: {
    color: colors.light.secondaryForeground,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 18,
  },
  licenseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.light.card,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: 17,
    padding: 15,
    marginTop: 22,
  },
  licenseCopy: { flex: 1, marginLeft: 12 },
  licenseTitle: {
    color: colors.light.foreground,
    fontSize: 13,
    fontWeight: "900",
  },
  licenseText: {
    color: colors.light.mutedForeground,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  sourceButton: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: colors.light.secondary,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginTop: 14,
  },
  sourceText: {
    color: colors.light.primary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginRight: 8,
  },
  stateTitle: {
    color: colors.light.foreground,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 14,
    textAlign: "center",
  },
  stateText: {
    color: colors.light.mutedForeground,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
    textAlign: "center",
  },
  primaryButton: {
    minWidth: 130,
    minHeight: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.light.primary,
    marginTop: 20,
  },
  primaryText: {
    color: colors.light.primaryForeground,
    fontSize: 13,
    fontWeight: "900",
  },
  secondaryButton: { padding: 14, marginTop: 5 },
  secondaryText: {
    color: colors.light.mutedForeground,
    fontSize: 12,
    fontWeight: "800",
  },
  pressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
});