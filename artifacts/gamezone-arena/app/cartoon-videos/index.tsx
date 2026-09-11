import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { ResizeMode, Video } from "expo-av";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  type CartoonVideo,
  getListCartoonVideosQueryKey,
  useListCartoonVideos,
} from "@workspace/api-client-react";
import { Feather } from "@/components/Feather";
import colors from "@/constants/colors";
import { resolveCartoonMediaUrl } from "@/lib/cartoonVideos";
import {
  type PickedVideo,
  pickCartoonVideo,
  pickCartoonVideoFile,
  recordCartoonVideo,
} from "@/lib/videoMediaPicker";

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function CartoonVideosScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [selectedVideo, setSelectedVideo] = useState<PickedVideo | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sourceMuted, setSourceMuted] = useState(false);
  const [resultMuted, setResultMuted] = useState(false);
  const listRef = useRef<FlatList<CartoonVideo>>(null);
  const sourceVideoRef = useRef<Video>(null);
  const resultVideoRef = useRef<Video>(null);
  const columns = width >= 700 ? 3 : 2;
  const query = useListCartoonVideos(undefined, {
    query: {
      queryKey: getListCartoonVideosQueryKey(),
      refetchOnMount: "always",
    },
  });
  const videos = query.data?.videos ?? [];

  async function chooseVideo(picker: () => Promise<PickedVideo | null>) {
    try {
      const picked = await picker();
      if (picked) {
        setSelectedVideo(picked);
        setGeneratedUrl(null);
        setSourceMuted(false);
        setResultMuted(false);
      }
    } catch (error) {
      Alert.alert(
        "Unable to choose video",
        error instanceof Error ? error.message : "Please try another video.",
      );
    }
  }

  async function generateCartoon() {
    if (!selectedVideo || isGenerating) return;
    setIsGenerating(true);
    try {
      const sourceResponse = await fetch(selectedVideo.uri);
      const videoBlob = await sourceResponse.blob();
      const token = await getToken();
      const response = await fetch(
        resolveCartoonMediaUrl("/api/cartoon-videos/generate"),
        {
          method: "POST",
          headers: {
            "Content-Type": selectedVideo.mimeType || "video/mp4",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: videoBlob,
        },
      );
      const result = await response.json();
      if (!response.ok || !result.videoUrl) {
        throw new Error(result.error || "Cartoon generation failed.");
      }
      const nextGeneratedUrl = resolveCartoonMediaUrl(result.videoUrl);
      setGeneratedUrl(nextGeneratedUrl);
      setResultMuted(false);
      setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: 680, animated: true });
      }, 350);
    } catch (error) {
      Alert.alert(
        "Unable to make cartoon",
        error instanceof Error ? error.message : "Please try another video.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function turnSourceSoundOn() {
    setSourceMuted(false);
    await sourceVideoRef.current?.setIsMutedAsync(false);
    await sourceVideoRef.current?.setVolumeAsync(1);
  }

  async function turnResultSoundOn() {
    setResultMuted(false);
    await resultVideoRef.current?.setIsMutedAsync(false);
    await resultVideoRef.current?.setVolumeAsync(1);
  }

  async function shareCartoon() {
    if (!generatedUrl) return;
    try {
      if (Platform.OS === "web") {
        window.open(generatedUrl, "_blank", "noopener,noreferrer");
        return;
      }
      await Share.share({
        title: "My Gamezone cartoon",
        message: `My Gamezone cartoon video: ${generatedUrl}`,
        url: generatedUrl,
      });
    } catch (error) {
      Alert.alert(
        "Unable to share cartoon",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  function createAnother() {
    setSelectedVideo(null);
    setGeneratedUrl(null);
    setSourceMuted(false);
    setResultMuted(false);
    listRef.current?.scrollToOffset({ offset: 130, animated: true });
  }

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Feather name="arrow-left" size={20} color={colors.light.foreground} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>CREATE & WATCH</Text>
          <Text style={styles.title}>Cartoon Videos</Text>
          <Text style={styles.subtitle}>
            Record or choose a 5-second video and turn it into a cartoon.
          </Text>
        </View>
      </View>

      <View style={styles.creatorCard}>
        <View style={styles.creatorHeading}>
          <View style={styles.creatorIcon}>
            <Feather name="video" size={22} color="#EC4899" />
          </View>
          <View style={styles.creatorCopy}>
            <Text style={styles.creatorTitle}>Make My Cartoon</Text>
            <Text style={styles.creatorNote}>Up to 5 seconds · voice stays in video</Text>
          </View>
        </View>

        <View style={styles.sourceRow}>
          <SourceButton
            icon="camera"
            label="CAMERA"
            onPress={() => void chooseVideo(recordCartoonVideo)}
          />
          <SourceButton
            icon="image"
            label="GALLERY"
            onPress={() => void chooseVideo(pickCartoonVideo)}
          />
          <SourceButton
            icon="folder"
            label="FILE"
            onPress={() => void chooseVideo(pickCartoonVideoFile)}
          />
        </View>

        {selectedVideo ? (
          <View style={styles.sourcePreviewWrap}>
            <View style={styles.previewHeadingRow}>
              <View>
                <Text style={styles.previewEyebrow}>1. YOUR ORIGINAL VIDEO</Text>
                <Text numberOfLines={1} style={styles.selectionText}>
                  {selectedVideo.name}
                </Text>
              </View>
              <Feather name="check-circle" size={20} color="#7CF2B2" />
            </View>
            <Video
              ref={sourceVideoRef}
              source={{ uri: selectedVideo.uri }}
              useNativeControls
              isMuted={sourceMuted}
              volume={1}
              resizeMode={ResizeMode.CONTAIN}
              style={styles.sourceVideo}
            />
            <Pressable
              accessibilityLabel="Turn original video sound on"
              onPress={() => void turnSourceSoundOn()}
              style={({ pressed }) => [styles.soundButton, pressed && styles.pressed]}
            >
              <Feather name="volume-2" size={17} color="#7CF2B2" />
              <Text style={styles.soundButtonText}>SOUND ON · ORIGINAL VOICE WILL STAY</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          disabled={!selectedVideo || isGenerating}
          onPress={() => void generateCartoon()}
          style={({ pressed }) => [
            styles.generateButton,
            (!selectedVideo || isGenerating) && styles.disabledButton,
            pressed && styles.pressed,
          ]}
        >
          {isGenerating ? (
            <View style={styles.generatingContent}>
              <ActivityIndicator color={colors.light.primaryForeground} />
              <View>
                <Text style={styles.generateText}>MAKING YOUR CARTOON…</Text>
                <Text style={styles.generatingNote}>Uploading video and keeping its sound</Text>
              </View>
            </View>
          ) : (
            <>
              <Feather name="zap" size={18} color={colors.light.primaryForeground} />
              <Text style={styles.generateText}>MAKE CARTOON</Text>
            </>
          )}
        </Pressable>

        {generatedUrl ? (
          <View style={styles.resultWrap}>
            <Text style={styles.resultTitle}>2. YOUR CARTOON IS READY</Text>
            <Text style={styles.resultIntro}>
              Play it here with sound. Use Save / Share before it expires.
            </Text>
            <Video
              ref={resultVideoRef}
              source={{ uri: generatedUrl }}
              useNativeControls
              shouldPlay
              isMuted={resultMuted}
              volume={1}
              resizeMode={ResizeMode.CONTAIN}
              style={styles.resultVideo}
            />
            <Pressable
              accessibilityLabel="Turn cartoon sound on"
              onPress={() => void turnResultSoundOn()}
              style={({ pressed }) => [styles.soundButton, styles.resultSoundButton, pressed && styles.pressed]}
            >
              <Feather name="volume-2" size={17} color="#7CF2B2" />
              <Text style={styles.soundButtonText}>TURN CARTOON SOUND ON</Text>
            </Pressable>
            <View style={styles.temporaryNote}>
              <Feather name="clock" size={16} color="#FFD56A" />
              <Text style={styles.temporaryText}>
                Temporary result: save or share it within 1 hour.
              </Text>
            </View>
            <View style={styles.resultActions}>
              <Pressable
                accessibilityLabel="Save or share cartoon"
                onPress={() => void shareCartoon()}
                style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
              >
                <Feather name="share-2" size={18} color="#07101F" />
                <Text style={styles.shareButtonText}>SAVE / SHARE</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Create another cartoon"
                onPress={createAnother}
                style={({ pressed }) => [styles.anotherButton, pressed && styles.pressed]}
              >
                <Feather name="refresh-cw" size={17} color="#FFFFFF" />
                <Text style={styles.anotherButtonText}>CREATE ANOTHER</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      <Text style={styles.catalogHeading}>CARTOON LIBRARY</Text>
    </View>
  );

  if (query.isLoading) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.stateTitle}>Loading cartoons</Text>
        <Text style={styles.stateText}>Getting the latest video list…</Text>
      </View>
    );
  }

  if (query.isError) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <Feather name="wifi-off" size={38} color={colors.light.destructive} />
        <Text style={styles.stateTitle}>Unable to load videos</Text>
        <Text style={styles.stateText}>
          Check your internet connection and try again.
        </Text>
        <Pressable
          onPress={() => void query.refetch()}
          style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
        >
          <Text style={styles.retryText}>RETRY</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        ref={listRef}
        key={columns}
        data={videos}
        numColumns={columns}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={columns > 1 ? styles.row : undefined}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 14, 24),
            paddingBottom: Math.max(insets.bottom + 30, 46),
          },
          videos.length === 0 && styles.emptyContent,
        ]}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="film" size={42} color={colors.light.mutedForeground} />
            <Text style={styles.stateTitle}>No cartoons yet</Text>
            <Text style={styles.stateText}>
              Licensed videos added to the API will appear here automatically.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <VideoCard
            video={item}
            columns={columns}
            onPress={() => router.push(`/cartoon-videos/${item.id}` as any)}
          />
        )}
      />
    </View>
  );
}

function VideoCard({
  video,
  columns,
  onPress,
}: {
  video: CartoonVideo;
  columns: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Play ${video.title}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { width: `${100 / columns - 2}%` },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.thumbnailWrap}>
        <Image
          source={{ uri: resolveCartoonMediaUrl(video.thumbnailUrl) }}
          resizeMode="cover"
          style={styles.thumbnail}
        />
        <View style={styles.playBadge}>
          <Feather name="play" size={18} color="#FFFFFF" />
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>
            {formatDuration(video.durationSeconds)}
          </Text>
        </View>
      </View>
      <Text numberOfLines={2} style={styles.cardTitle}>
        {video.title}
      </Text>
      <Text numberOfLines={1} style={styles.category}>
        {video.category}
      </Text>
    </Pressable>
  );
}

function SourceButton({
  icon,
  label,
  onPress,
}: {
  icon: "camera" | "image" | "folder";
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.sourceButton, pressed && styles.pressed]}
    >
      <Feather name={icon} size={20} color={colors.light.primary} />
      <Text style={styles.sourceLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#101944" },
  content: { paddingHorizontal: 16 },
  emptyContent: { flexGrow: 1 },
  headerBlock: { marginBottom: 8 },
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 24 },
  headerText: { flex: 1, paddingLeft: 13 },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.light.card,
    borderWidth: 2,
    borderColor: "#708DCA",
  },
  eyebrow: {
    color: colors.light.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.7,
  },
  title: {
    color: colors.light.foreground,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 3,
  },
  subtitle: {
    color: colors.light.mutedForeground,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  creatorCard: {
    borderRadius: 24,
    padding: 19,
    backgroundColor: "#351B52",
    borderWidth: 2,
    borderColor: "#FF73C6",
    marginBottom: 24,
  },
  creatorHeading: { flexDirection: "row", alignItems: "center" },
  creatorIcon: {
    width: 54,
    height: 54,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EC48994A",
  },
  creatorCopy: { flex: 1, marginLeft: 12 },
  creatorTitle: {
    color: colors.light.foreground,
    fontSize: 20,
    fontWeight: "900",
  },
  creatorNote: {
    color: "#D8C8F4",
    fontSize: 12,
    marginTop: 3,
  },
  sourceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  sourceButton: {
    width: "31.5%",
    minHeight: 82,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#283D72",
    borderWidth: 2,
    borderColor: "#5F7FBC",
  },
  sourceLabel: {
    color: colors.light.secondaryForeground,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginTop: 7,
  },
  sourcePreviewWrap: {
    marginTop: 14,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#111B3E",
    borderWidth: 1,
    borderColor: "#617AB2",
  },
  previewHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  previewEyebrow: {
    color: "#7CF2B2",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  selectionText: {
    maxWidth: 245,
    color: colors.light.secondaryForeground,
    fontSize: 12,
    marginTop: 3,
  },
  sourceVideo: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 13,
    backgroundColor: "#000000",
  },
  soundButton: {
    minHeight: 43,
    marginTop: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#173D41",
    borderWidth: 1,
    borderColor: "#47A985",
  },
  soundButtonText: {
    color: "#E7FFF2",
    fontSize: 10,
    fontWeight: "900",
    marginLeft: 7,
  },
  generateButton: {
    minHeight: 58,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.light.primary,
    marginTop: 14,
  },
  disabledButton: { opacity: 0.42 },
  generatingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  generateText: {
    color: colors.light.primaryForeground,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginLeft: 8,
  },
  generatingNote: {
    color: "#07101F",
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 8,
    marginTop: 2,
  },
  resultWrap: {
    marginTop: 20,
    padding: 13,
    borderRadius: 18,
    backgroundColor: "#12294A",
    borderWidth: 2,
    borderColor: "#58D99C",
  },
  resultTitle: {
    color: "#7CF2B2",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 5,
  },
  resultIntro: {
    color: "#D6E2FF",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  resultVideo: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 14,
    backgroundColor: "#000000",
  },
  resultSoundButton: { marginTop: 10 },
  temporaryNote: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 11,
    padding: 10,
    borderRadius: 11,
    backgroundColor: "#FFD56A18",
  },
  temporaryText: {
    flex: 1,
    color: "#FFE6A7",
    fontSize: 11,
    lineHeight: 16,
    marginLeft: 8,
  },
  resultActions: {
    flexDirection: "row",
    gap: 9,
    marginTop: 12,
  },
  shareButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#58D99C",
  },
  shareButtonText: {
    color: "#07101F",
    fontSize: 10,
    fontWeight: "900",
    marginLeft: 7,
  },
  anotherButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B4E80",
    borderWidth: 1,
    borderColor: "#708DCA",
  },
  anotherButtonText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    marginLeft: 7,
  },
  catalogHeading: {
    color: "#D6E0FF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  row: { justifyContent: "space-between" },
  card: {
    marginBottom: 18,
    borderRadius: 21,
    backgroundColor: "#1B2B55",
    borderWidth: 2,
    borderColor: "#627FB6",
    overflow: "hidden",
  },
  thumbnailWrap: {
    width: "100%",
    aspectRatio: 16 / 10,
    backgroundColor: colors.light.muted,
  },
  thumbnail: { width: "100%", height: "100%" },
  playBadge: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 40,
    height: 40,
    marginLeft: -20,
    marginTop: -20,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(7,10,19,0.82)",
  },
  durationBadge: {
    position: "absolute",
    right: 8,
    bottom: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: "rgba(7,10,19,0.88)",
  },
  durationText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  cardTitle: {
    color: colors.light.cardForeground,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900",
    paddingHorizontal: 12,
    paddingTop: 11,
  },
  category: {
    color: colors.light.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
    paddingHorizontal: 12,
    paddingTop: 5,
    paddingBottom: 13,
    textTransform: "uppercase",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  stateTitle: {
    color: colors.light.foreground,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 14,
  },
  stateText: {
    color: colors.light.mutedForeground,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 7,
  },
  retryButton: {
    marginTop: 20,
    minWidth: 126,
    minHeight: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.light.primary,
  },
  retryText: {
    color: colors.light.primaryForeground,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
});