import { Alert, Linking, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedExtensions = /\.(jpe?g|png|webp)$/i;

export type PickedImage = ImagePicker.ImagePickerAsset;

function showWebMediaMenu(title: string, run: (source: "camera" | "gallery" | "files") => void) {
  const overlay = document.createElement("div");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", title);
  Object.assign(overlay.style, { position: "fixed", inset: "0", zIndex: "2147483647", background: "rgba(0,0,0,.65)", display: "flex", alignItems: "flex-end", justifyContent: "center" });
  const sheet = document.createElement("div");
  Object.assign(sheet.style, { width: "100%", maxWidth: "520px", padding: "20px", borderRadius: "22px 22px 0 0", background: "#070A13", color: "#fff", fontFamily: "system-ui, sans-serif" });
  const heading = document.createElement("h2");
  heading.textContent = title;
  Object.assign(heading.style, { margin: "0 0 8px", fontSize: "22px" });
  const note = document.createElement("p");
  note.textContent = "JPG, PNG and WebP images up to 5 MB are supported.";
  Object.assign(note.style, { margin: "0 0 14px", color: "#9ca3af" });
  sheet.append(heading, note);
  const close = () => overlay.remove();
  const addButton = (label: string, source?: "camera" | "gallery" | "files") => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    Object.assign(button.style, { width: "100%", marginTop: "9px", padding: "14px", border: "1px solid #263247", borderRadius: "12px", background: source ? "#111827" : "transparent", color: "#fff", fontSize: "16px", fontWeight: "700" });
    button.onclick = () => { close(); if (source) run(source); };
    sheet.appendChild(button);
  };
  addButton("📷 Take Photo", "camera");
  addButton("🖼️ Photo Library", "gallery");
  addButton("📁 Image Files", "files");
  addButton("❌ Cancel");
  overlay.onclick = event => { if (event.target === overlay) close(); };
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
}

function validate(assets: PickedImage[]) {
  for (const asset of assets) {
    const hasSupportedMimeType = asset.mimeType ? allowedTypes.has(asset.mimeType) : !!asset.fileName && allowedExtensions.test(asset.fileName);
    if (!hasSupportedMimeType) {
      throw new Error("Only JPG, PNG, and WebP images are supported. Video and document uploads are not supported for this field.");
    }
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
      throw new Error("Each image must be 5 MB or smaller.");
    }
  }
  return assets;
}

async function camera(): Promise<PickedImage[]> {
  if (Platform.OS === "web") {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      let settled = false;
      let pickerOpened = false;
      const cleanup = () => {
        window.removeEventListener("blur", markPickerOpened);
        window.removeEventListener("focus", cancelAfterDialogCloses);
        input.remove();
      };
      const finish = (assets: PickedImage[]) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(assets);
      };
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };
      const markPickerOpened = () => { pickerOpened = true; };
      const cancelAfterDialogCloses = () => {
        if (pickerOpened) setTimeout(() => finish([]), 0);
      };
      input.type = "file";
      input.accept = "image/jpeg,image/png,image/webp";
      input.capture = "environment";
      input.style.display = "none";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return finish([]);
        try {
          finish(validate([{
            uri: URL.createObjectURL(file),
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            width: 0,
            height: 0,
            type: "image",
            file,
          } as PickedImage]));
        } catch (error) {
          fail(error instanceof Error ? error : new Error("Photo selection failed. Please try again."));
        }
      };
      input.oncancel = () => {
        finish([]);
      };
      input.onerror = () => fail(new Error("Your browser could not open the camera. Try Photo Library or Image Files instead."));
      window.addEventListener("blur", markPickerOpened, { once: true });
      window.addEventListener("focus", cancelAfterDialogCloses, { once: true });
      document.body.appendChild(input);
      try {
        input.click();
      } catch {
        fail(new Error("Your browser could not open the camera. Try Photo Library or Image Files instead."));
      }
    });
  }
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Camera permission required",
      "Camera permission is required to take a photo. You can enable it in Settings, or choose Photo Library or Image Files from the Add Photo menu.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => {
            void Linking.openSettings().catch(() => {
              Alert.alert("Unable to open Settings", "Please enable Camera permission in your device Settings, then try again.");
            });
          },
        },
      ],
    );
    return [];
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 0.7,
  });
  return result.canceled ? [] : validate(result.assets);
}

async function gallery(multiple: boolean): Promise<PickedImage[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
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
  if (Platform.OS === "web") {
    showWebMediaMenu(options.title ?? "Add Photo", source => void run(source));
    return;
  }
  Alert.alert(
    options.title ?? "Add Photo",
    "JPG, PNG and WebP images up to 5 MB are supported. Videos and documents are not supported for this field.",
    [
      { text: "📷 Take Photo", onPress: () => void run("camera") },
      { text: "🖼️ Photo Library", onPress: () => void run("gallery") },
      { text: "📁 Image Files", onPress: () => void run("files") },
      { text: "❌ Cancel", style: "cancel" },
    ],
  );
}