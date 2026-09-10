import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";

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
  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose}>
      <View style={styles.container}>
        <Text style={styles.icon}>🗺️</Text>
        <Text style={styles.title}>Map available in the Android app</Text>
        <Text style={styles.body}>The web preview uses a safe location fallback. You can still use your current location.</Text>
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
});