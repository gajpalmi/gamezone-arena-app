import { Alert, Linking, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

export type PickedVideo = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  durationMs?: number | null;
};

function validate(video: PickedVideo) {
  if (!video.mimeType.startsWith("video/")) {
    throw new Error("Please choose a video file.");
  }
  if (video.size && video.size > MAX_VIDEO_BYTES) {
    throw new Error("Video must be 25 MB or smaller.");
  }
  if (video.durationMs && video.durationMs > 5_500) {
    throw new Error("Video must be 5 seconds or shorter.");
  }
  return video;
}

function fromImagePicker(asset: ImagePicker.ImagePickerAsset): PickedVideo {
  return validate({
    uri: asset.uri,
    name: asset.fileName || `gamezone-video-${Date.now()}.mp4`,
    mimeType: asset.mimeType || "video/mp4",
    size: asset.fileSize,
    durationMs: asset.duration,
  });
}

export async function recordCartoonVideo() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Camera permission required",
      "Enable camera access in Settings, then try again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => void Linking.openSettings(),
        },
      ],
    );
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["videos"],
    videoMaxDuration: 5,
    videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
  });
  return result.canceled ? null : fromImagePicker(result.assets[0]);
}

export async function pickCartoonVideo() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted && Platform.OS !== "web") {
    Alert.alert("Permission required", "Allow photo library access to choose a video.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["videos"],
    videoMaxDuration: 5,
    videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
  });
  return result.canceled ? null : fromImagePicker(result.assets[0]);
}

export async function pickCartoonVideoFile() {
  const result = await DocumentPicker.getDocumentAsync({
    type: "video/*",
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const previewUri =
    Platform.OS === "web" && asset.file
      ? URL.createObjectURL(asset.file)
      : asset.uri;
  return validate({
    uri: previewUri,
    name: asset.name,
    mimeType: asset.mimeType || "video/mp4",
    size: asset.size,
  });
}