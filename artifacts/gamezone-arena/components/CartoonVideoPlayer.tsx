import React, { useEffect } from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";

type CartoonVideoPlayerProps = {
  uri: string;
  muted?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function CartoonVideoPlayer({
  uri,
  muted = false,
  autoPlay = true,
  loop = true,
  style,
}: CartoonVideoPlayerProps) {
  const player = useVideoPlayer(uri, (nextPlayer) => {
    nextPlayer.loop = loop;
    nextPlayer.muted = muted;
    nextPlayer.volume = 1;
    if (autoPlay) nextPlayer.play();
  });
  const { status, error } = useEvent(player, "statusChange", {
    status: player.status,
    error: undefined,
  });

  useEffect(() => {
    player.muted = muted;
    player.volume = 1;
  }, [muted, player]);

  return (
    <View style={[styles.frame, style]}>
      <VideoView
        player={player}
        nativeControls
        contentFit="contain"
        surfaceType="textureView"
        allowsFullscreen
        allowsPictureInPicture
        style={styles.video}
      />
      {status === "loading" || status === "idle" ? (
        <View pointerEvents="none" style={styles.status}>
          <ActivityIndicator color="#7CF2B2" />
          <Text style={styles.statusText}>Preparing video…</Text>
        </View>
      ) : null}
      {status === "error" ? (
        <View pointerEvents="none" style={styles.status}>
          <Text style={styles.errorTitle}>VIDEO COULD NOT PLAY</Text>
          <Text style={styles.errorText}>
            {error?.message || "This phone cannot preview this video format."}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  status: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    backgroundColor: "rgba(5,8,22,0.9)",
  },
  statusText: {
    color: "#D6E2FF",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 9,
  },
  errorTitle: {
    color: "#FF8A9B",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  errorText: {
    color: "#FFFFFF",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 7,
  },
});