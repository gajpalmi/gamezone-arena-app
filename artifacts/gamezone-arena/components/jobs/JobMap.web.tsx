import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useEffect, useState } from "react";

type Props = {
  visible: boolean;
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  marker: { latitude: number; longitude: number } | null;
  locationLoading: boolean;
  mapLoading: boolean;
  selectedLocation: string;
  onClose: () => void;
  onMapPress: (latitude: number, longitude: number) => void | Promise<void>;
  onCurrentLocation: () => void | Promise<void>;
  onConfirm: () => void;
};

export default function JobMap(props: Props) {
  const [latitude, setLatitude] = useState(String(props.marker?.latitude ?? props.region.latitude));
  const [longitude, setLongitude] = useState(String(props.marker?.longitude ?? props.region.longitude));
  const [coordinateError, setCoordinateError] = useState("");
  useEffect(() => {
    if (!props.visible) return;
    setLatitude(String(props.marker?.latitude ?? props.region.latitude));
    setLongitude(String(props.marker?.longitude ?? props.region.longitude));
    setCoordinateError("");
  }, [props.marker?.latitude, props.marker?.longitude, props.region.latitude, props.region.longitude, props.visible]);
  const applyTyped = () => {
    const lat = Number(latitude), lon = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setCoordinateError("Enter a latitude from -90 to 90 and longitude from -180 to 180.");
      return;
    }
    setCoordinateError("");
    void props.onMapPress(lat, lon);
  };
  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose}>
      <View style={styles.container}>
        <Text style={styles.icon}>🗺️</Text>
        <Text style={styles.title}>Choose job location</Text>
        <Text style={styles.body}>Use your current location, or enter coordinates and apply them.</Text>
        <View style={styles.coordinates}>
          <TextInput accessibilityLabel="Latitude" style={styles.input} value={latitude} onChangeText={setLatitude} keyboardType="numeric" placeholder="Latitude" />
          <TextInput accessibilityLabel="Longitude" style={styles.input} value={longitude} onChangeText={setLongitude} keyboardType="numeric" placeholder="Longitude" />
          <Pressable onPress={applyTyped} style={styles.apply}><Text style={styles.primaryText}>APPLY</Text></Pressable>
        </View>
        {coordinateError ? <Text accessibilityRole="alert" style={styles.error}>{coordinateError}</Text> : null}
        <Text style={styles.location}>{props.selectedLocation || "No location selected."}</Text>
        {props.mapLoading ? <ActivityIndicator /> : null}
        <Pressable disabled={props.locationLoading} onPress={() => void props.onCurrentLocation()} style={styles.primary}>
          {props.locationLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>USE CURRENT LOCATION</Text>}
        </Pressable>
        <View style={styles.row}>
          <Pressable onPress={props.onClose} style={styles.secondary}><Text style={styles.secondaryText}>CLOSE</Text></Pressable>
          <Pressable disabled={!props.marker} onPress={props.onConfirm} style={[styles.primary, styles.flex, !props.marker && styles.disabled]}>
            <Text style={styles.primaryText}>USE LOCATION</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, backgroundColor: "#f8fafc", gap: 14 },
  icon: { fontSize: 54 },
  title: { fontSize: 20, fontWeight: "800", color: "#111827", textAlign: "center" },
  body: { maxWidth: 480, color: "#64748b", textAlign: "center", lineHeight: 21 },
  location: { maxWidth: 480, color: "#111827", fontWeight: "600", textAlign: "center" },
  row: { width: "100%", maxWidth: 420, flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
  primary: { width: "100%", maxWidth: 420, minHeight: 48, borderRadius: 12, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center", padding: 10 },
  primaryText: { color: "#fff", fontWeight: "800", textAlign: "center" },
  secondary: { flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center" },
  secondaryText: { color: "#111827", fontWeight: "800" },
  disabled: { opacity: 0.5 },
  coordinates: { width: "100%", maxWidth: 420, flexDirection: "row", gap: 8 },
  input: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, paddingHorizontal: 10, color: "#111827", backgroundColor: "#fff" },
  apply: { minHeight: 44, borderRadius: 8, backgroundColor: "#0f766e", justifyContent: "center", paddingHorizontal: 12 },
  error: { color: "#b91c1c", fontSize: 12, fontWeight: "700", textAlign: "center" },
});