import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CartoonVideoPlayer } from "@/components/CartoonVideoPlayer";
import { Feather } from "@/components/Feather";
import colors from "@/constants/colors";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function CartoonResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    url?: string | string[];
    id?: string | string[];
  }>();
  const videoUrl = firstParam(params.url) ?? "";
  const videoId = firstParam(params.id) ?? "cartoon";
  const [muted, setMuted] = useState(false);
  const [busyAction, setBusyAction] = useState<"save" | "share" | null>(null);
  const [webMediaReady, setWebMediaReady] = useState(Platform.OS !== "web");
  const downloadedFile = useRef<string | null>(null);
  const webVideoFile = useRef<File | null>(null);

  async function getWebVideoFile() {
    if (webVideoFile.current) return webVideoFile.current;
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error("Video download failed.");
    }
    const blob = await response.blob();
    const file = new File([blob], `gamezone-${videoId}.mp4`, {
      type: "video/mp4",
    });
    webVideoFile.current = file;
    setWebMediaReady(true);
    return file;
  }

  useEffect(() => {
    if (Platform.OS !== "web" || !videoUrl) return;
    let active = true;
    void getWebVideoFile().catch(() => {
      if (active) setWebMediaReady(false);
    });
    return () => {
      active = false;
      webVideoFile.current = null;
    };
  }, [videoId, videoUrl]);

  async function getDownloadedFile() {
    if (downloadedFile.current) return downloadedFile.current;
    if (!FileSystem.cacheDirectory) {
      throw new Error("Phone storage is not available.");
    }
    const destination = `${FileSystem.cacheDirectory}gamezone-${videoId}.mp4`;
    const download = await FileSystem.downloadAsync(videoUrl, destination);
    if (download.status < 200 || download.status >= 300) {
      throw new Error("Video download failed.");
    }
    downloadedFile.current = download.uri;
    return download.uri;
  }

  async function removeDownloadedFile() {
    const localUri = downloadedFile.current;
    downloadedFile.current = null;
    if (localUri) {
      await FileSystem.deleteAsync(localUri, { idempotent: true });
    }
  }

  async function saveCartoon() {
    if (!videoUrl || busyAction) return;
    setBusyAction("save");
    try {
      if (Platform.OS === "web") {
        const file = await getWebVideoFile();
        const objectUrl = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
        window.alert("Cartoon video downloaded. Check Downloads or Gallery on your phone.");
        return;
      }
      const permission = await MediaLibrary.requestPermissionsAsync(true, ["video"]);
      if (!permission.granted) {
        throw new Error("Allow photo and video access to save your cartoon.");
      }
      const localUri = await getDownloadedFile();
      await MediaLibrary.createAssetAsync(localUri);
      Alert.alert("Cartoon saved", "Your video is now in the phone gallery.");
    } catch (error) {
      Alert.alert(
        "Unable to save cartoon",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      if (Platform.OS !== "web") await removeDownloadedFile();
      setBusyAction(null);
    }
  }

  async function shareCartoon() {
    if (!videoUrl || busyAction) return;
    setBusyAction("share");
    try {
      if (Platform.OS === "web") {
        const file = await getWebVideoFile();
        const shareData = {
          files: [file],
          title: "My Gamezone cartoon",
          text: "Watch my Gamezone cartoon video",
        };
        if (!navigator.share || (navigator.canShare && !navigator.canShare(shareData))) {
          throw new Error(
            "This browser cannot share video files. Open this page in Android Chrome.",
          );
        }
        await navigator.share(shareData);
        return;
      }
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error("Sharing is not available on this phone.");
      }
      const localUri = await getDownloadedFile();
      await Sharing.shareAsync(localUri, {
        mimeType: "video/mp4",
        dialogTitle: "Share my Gamezone cartoon",
        UTI: "public.mpeg-4",
      });
    } catch (error) {
      Alert.alert(
        "Unable to share cartoon",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      if (Platform.OS !== "web") await removeDownloadedFile();
      setBusyAction(null);
    }
  }

  if (!videoUrl) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <Feather name="alert-circle" size={42} color={colors.light.destructive} />
        <Text style={styles.stateTitle}>Cartoon unavailable</Text>
        <Text style={styles.stateText}>Please create the cartoon again.</Text>
        <Pressable onPress={() => router.replace("/cartoon-videos")} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>CREATE CARTOON</Text>
        </Pressable>
      </View>
    );
  }

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
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Feather name="arrow-left" size={20} color={colors.light.foreground} />
          </Pressable>
          <View style={styles.readyBadge}>
            <Feather name="check-circle" size={18} color={colors.light.primaryForeground} />
            <Text style={styles.readyBadgeText}>READY</Text>
          </View>
        </View>

        <Text style={styles.eyebrow}>YOUR CARTOON IS READY</Text>
        <Text style={styles.title}>Watch, save or share</Text>
        <Text style={styles.subtitle}>
          Your original video has a cartoon style. No avatar was added.
        </Text>

        <CartoonVideoPlayer
          key={videoUrl}
          uri={videoUrl}
          muted={muted}
          style={styles.player}
        />

        <Pressable
          onPress={() => setMuted((current) => !current)}
          style={({ pressed }) => [styles.soundButton, pressed && styles.pressed]}
        >
          <Feather name={muted ? "volume-x" : "volume-2"} size={18} color="#7CF2B2" />
          <Text style={styles.soundButtonText}>{muted ? "TURN SOUND ON" : "SOUND IS ON"}</Text>
        </Pressable>

        <View style={styles.actions}>
          <Pressable
            disabled={Boolean(busyAction)}
            onPress={() => void saveCartoon()}
            style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
          >
            {busyAction === "save" ? (
              <ActivityIndicator color={colors.light.primaryForeground} />
            ) : (
              <Feather name="download" size={21} color={colors.light.primaryForeground} />
            )}
            <Text style={styles.saveButtonText}>SAVE TO GALLERY</Text>
          </Pressable>
          <Pressable
            disabled={Boolean(busyAction) || !webMediaReady}
            onPress={() => void shareCartoon()}
            style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
          >
            {busyAction === "share" ? (
              <ActivityIndicator color={colors.light.foreground} />
            ) : (
              <Feather name="share-2" size={21} color={colors.light.foreground} />
            )}
            <Text style={styles.shareButtonText}>
              {webMediaReady ? "SHARE VIDEO" : "PREPARING SHARE..."}
            </Text>
          </Pressable>
        </View>

        <View style={styles.note}>
          <Feather name="clock" size={18} color="#FFD56A" />
          <Text style={styles.noteText}>
            This result stays available for 1 hour. Save it now to keep it.
          </Text>
        </View>

        <Pressable
          onPress={() => router.replace("/cartoon-videos")}
          style={({ pressed }) => [styles.anotherButton, pressed && styles.pressed]}
        >
          <Feather name="refresh-cw" size={17} color={colors.light.primary} />
          <Text style={styles.anotherButtonText}>CREATE ANOTHER CARTOON</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.light.background },
  content: { paddingHorizontal: 18 },
  center: { alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.light.card,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  readyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 99,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: "#7CF2B2",
  },
  readyBadgeText: {
    color: colors.light.primaryForeground,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  eyebrow: {
    color: "#7CF2B2",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.7,
    marginTop: 24,
  },
  title: {
    color: colors.light.foreground,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
    marginTop: 5,
  },
  subtitle: {
    color: colors.light.mutedForeground,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  player: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#7CF2B2",
    marginTop: 22,
  },
  soundButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 14,
    backgroundColor: "#132443",
    borderWidth: 1,
    borderColor: "#31547D",
    marginTop: 12,
  },
  soundButtonText: { color: "#7CF2B2", fontSize: 12, fontWeight: "900" },
  actions: { gap: 12, marginTop: 18 },
  saveButton: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 17,
    backgroundColor: colors.light.primary,
  },
  saveButtonText: {
    color: colors.light.primaryForeground,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  shareButton: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 17,
    backgroundColor: colors.light.secondary,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  shareButtonText: {
    color: colors.light.foreground,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 15,
    padding: 14,
    backgroundColor: "#2B2340",
    marginTop: 16,
  },
  noteText: { flex: 1, color: "#FFE5A1", fontSize: 12, lineHeight: 18, fontWeight: "700" },
  anotherButton: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 10,
  },
  anotherButtonText: { color: colors.light.primary, fontSize: 12, fontWeight: "900" },
  stateTitle: {
    color: colors.light.foreground,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 14,
    textAlign: "center",
  },
  stateText: {
    color: colors.light.mutedForeground,
    fontSize: 14,
    marginTop: 7,
    textAlign: "center",
  },
  primaryButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: colors.light.primary,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  primaryButtonText: { color: colors.light.primaryForeground, fontSize: 13, fontWeight: "900" },
  pressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
});