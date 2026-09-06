import { Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export type PickedImage = ImagePicker.ImagePickerAsset;

function validate(assets: PickedImage[]) {
  for (const asset of assets) {
    if (asset.mimeType && !allowedTypes.has(asset.mimeType)) {
      throw new Error("Only JPG, PNG, and WebP images are supported. Video and document uploads are not supported for this field.");
    }
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
      throw new Error("Each image must be 5 MB or smaller.");
    }
  }
  return assets;
}

async function camera(): Promise<PickedImage[]> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("Camera permission required", "Allow camera access after tapping Camera to take a photo.");
    return [];
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.7,
  });
  return result.canceled ? [] : validate(result.assets);
}

async function gallery(multiple: boolean): Promise<PickedImage[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: multiple,
    selectionLimit: multiple ? 8 : 1,
    quality: 0.7,
  });
  return result.canceled ? [] : validate(result.assets);
}

async function files(multiple: boolean): Promise<PickedImage[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["image/jpeg", "image/png", "image/webp"],
    multiple,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];
  return validate(result.assets.map(asset => ({
    uri: asset.uri,
    fileName: asset.name,
    mimeType: asset.mimeType ?? undefined,
    fileSize: asset.size,
    width: 0,
    height: 0,
    type: "image",
  } as PickedImage)));
}

export function openImageMediaPicker(options: {
  title?: string;
  multiple?: boolean;
  onPicked: (assets: PickedImage[]) => void | Promise<void>;
}) {
  const run = async (source: "camera" | "gallery" | "files") => {
    try {
      const assets = source === "camera" ? await camera() : source === "gallery" ? await gallery(!!options.multiple) : await files(!!options.multiple);
      if (assets.length) await options.onPicked(assets);
    } catch (error) {
      console.error(`Media picker failed (${source})`, error);
      Alert.alert("Unable to add photo", error instanceof Error ? error.message : "Photo selection failed. Please try again.");
    }
  };
  Alert.alert(
    options.title ?? "Add Photo",
    "JPG, PNG and WebP images up to 5 MB are supported. Videos and documents are not supported for this field.",
    [
      { text: "📷 Camera", onPress: () => void run("camera") },
      { text: "🖼️ Photos / Videos", onPress: () => void run("gallery") },
      { text: "📁 Files", onPress: () => void run("files") },
      { text: "❌ Cancel", style: "cancel" },
    ],
  );
}