import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  type CartoonVideo,
  getListCartoonVideosQueryKey,
  useListCartoonVideos,
} from "@workspace/api-client-react";
import { Feather } from "@/components/Feather";
import { CartoonVideoPlayer } from "@/components/CartoonVideoPlayer";
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [sourceMuted, setSourceMuted] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
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
        setSourceMuted(false);
        setGenerationError(null);
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
    setGenerationError(null);
    try {
      const sourceResponse = await fetch(selectedVideo.uri);
      const videoBlob = await sourceResponse.blob();
      if (!videoBlob.size || videoBlob.size > 100 * 1024 * 1024) {
        throw new Error("Video must be 100 MB or smaller.");
      }
      const authHeaders = async (): Promise<Record<string, string>> => {
        const token = await getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      };
      const initResponse = await fetch(resolveCartoonMediaUrl("/api/cartoon-videos/upload/init"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ size: videoBlob.size, mimeType: selectedVideo.mimeType || "video/mp4" }),
      });
      const initResult = await initResponse.json();
      if (!initResponse.ok || !initResult.uploadId) {
        throw new Error(initResult.error || "Unable to start the video upload.");
      }
      const chunkSize = Number(initResult.chunkSize) || 2 * 1024 * 1024;
      for (let offset = 0, chunkIndex = 0; offset < videoBlob.size; offset += chunkSize, chunkIndex += 1) {
        const chunk = videoBlob.slice(offset, Math.min(offset + chunkSize, videoBlob.size));
        const chunkResponse = await fetch(
          resolveCartoonMediaUrl(`/api/cartoon-videos/upload/${initResult.uploadId}/chunk`),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "X-Chunk-Index": String(chunkIndex),
              "X-Chunk-Offset": String(offset),
              ...(await authHeaders()),
            },
            body: chunk,
          },
        );
        const chunkResult = await chunkResponse.json();
        if (!chunkResponse.ok) throw new Error(chunkResult.error || "The video upload failed.");
        setUploadProgress(Math.round((Number(chunkResult.receivedBytes) / videoBlob.size) * 100));
      }
      const response = await fetch(
        resolveCartoonMediaUrl(`/api/cartoon-videos/upload/${initResult.uploadId}/complete`),
        { method: "POST", headers: { "Content-Type": "application/json", ...(await authHeaders()) }, body: "{}" },
      );
      let result = await response.json();
      if (!response.ok && response.status !== 202) {
        throw new Error(result.error || "Cartoon generation failed.");
      }
      // Completion only queues FFmpeg work. Poll short requests so a mobile
      // browser never has to keep the long-running completion request open.
      for (let attempt = 0; result.status === "processing" && attempt < 300; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const statusResponse = await fetch(
          resolveCartoonMediaUrl(`/api/cartoon-videos/upload/${initResult.uploadId}/status`),
          { headers: await authHeaders() },
        );
        result = await statusResponse.json();
        if (!statusResponse.ok && statusResponse.status !== 202) {
          throw new Error(result.error || "Cartoon processing status was unavailable.");
        }
      }
      if (result.status === "processing") {
        throw new Error("Cartoon processing is taking too long. Please try again.");
      }
      if (!result.videoUrl) {
        throw new Error(result.error || "Cartoon generation failed.");
      }
      const nextGeneratedUrl = resolveCartoonMediaUrl(result.videoUrl);
      router.push({
        pathname: "/cartoon-videos/result",
        params: {
          id: String(result.id ?? "cartoon"),
          url: nextGeneratedUrl,
        },
      } as any);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try another video.";
      setGenerationError(message);
      Alert.alert(
        "Unable to make cartoon",
        message,
      );
    } finally {
      setIsGenerating(false);
      setUploadProgress(0);
    }
  }

  async function turnSourceSoundOn() {
    setSourceMuted(false);
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
            Record or choose a video up to 1 minute and turn it into a cartoon.
          </Text>
        </View>
      </View>

      <View style={styles.creatorCard}>
        <View style={styles.creatorHeading}>
          <View style={styles.creatorIcon}>
            <Feather name="video" size={22} color="#EC4899" />
          </View>
          <View style={styles.creatorCopy}>
            <Text style={styles.creatorTitle}>Make My Video Cartoon</Text>
            <Text style={styles.creatorNote}>
              No sign-in needed · no avatar · your video gets a cartoon style
            </Text>
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

        {isGenerating ? (
          <View style={styles.processingStage}>
            <View style={styles.processingSpinner}>
              <ActivityIndicator size="large" color="#07101F" />
            </View>
            <Text style={styles.processingTitle}>MAKING YOUR CARTOON VIDEO</Text>
            <Text style={styles.processingText}>
               {uploadProgress > 0 && uploadProgress < 100
                 ? `Uploading video… ${uploadProgress}% Keep this screen open.`
                 : "Your video is changing to cartoon style. Keep this screen open. The finished video will open on a new result screen."}
            </Text>
            <View style={styles.processingFile}>
              <Feather name="film" size={17} color="#7CF2B2" />
              <Text numberOfLines={1} style={styles.processingFileText}>
                {selectedVideo?.name}
              </Text>
            </View>
          </View>
        ) : selectedVideo ? (
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
            <CartoonVideoPlayer
              key={selectedVideo.uri}
              uri={selectedVideo.uri}
              muted={sourceMuted}
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

        {!isGenerating ? (
          <>
            {generationError ? (
              <View style={styles.generationError}>
                <Feather name="alert-triangle" size={18} color="#FFD56A" />
                <Text style={styles.generationErrorText}>{generationError}</Text>
              </View>
            ) : null}
            <Pressable
              disabled={!selectedVideo}
              onPress={() => void generateCartoon()}
              style={({ pressed }) => [
                styles.generateButton,
                !selectedVideo && styles.disabledButton,
                pressed && styles.pressed,
              ]}
            >
            <>
              <Feather name="zap" size={18} color={colors.light.primaryForeground} />
              <Text style={styles.generateText}>MAKE CARTOON</Text>
            </>
            </Pressable>
          </>
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
  playerFrame: {
    position: "relative",
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#050816",
  },
  playerStatus: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    backgroundColor: "rgba(5,8,22,0.92)",
  },
  playerStatusText: {
    color: "#D6E2FF",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 9,
  },
  playerErrorText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 8,
  },
  playerHelpText: {
    color: "#B8C7EC",
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
    marginTop: 5,
  },
  previewError: {
    alignItems: "center",
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#4A1B35",
    borderWidth: 1,
    borderColor: "#D95A7B",
  },
  previewErrorTitle: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 8,
  },
  previewErrorText: {
    color: "#FFD6DF",
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
    marginTop: 5,
  },
  previewErrorHelp: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 7,
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
  generateText: {
    color: colors.light.primaryForeground,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginLeft: 8,
  },
  generationError: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 11,
    borderRadius: 12,
    backgroundColor: "#5A351D",
    borderWidth: 1,
    borderColor: "#B9803B",
  },
  generationErrorText: {
    flex: 1,
    color: "#FFE6B0",
    fontSize: 11,
    lineHeight: 16,
    marginLeft: 8,
  },
  processingStage: {
    alignItems: "center",
    marginTop: 16,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#15395A",
    borderWidth: 2,
    borderColor: "#4FC9E8",
  },
  processingSpinner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4FC9E8",
  },
  processingTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.8,
    textAlign: "center",
    marginTop: 14,
  },
  processingText: {
    color: "#D6E9FF",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 7,
  },
  processingFile: {
    width: "100%",
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
    paddingHorizontal: 11,
    borderRadius: 11,
    backgroundColor: "#0B2038",
  },
  processingFileText: {
    flex: 1,
    color: "#E8F3FF",
    fontSize: 11,
    marginLeft: 8,
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
    height: "100%",
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