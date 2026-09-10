import React from "react";

import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import MapView, {
  Marker,
  type MapPressEvent,
  type Region,
} from "react-native-maps";

type MarkerPosition = {
  latitude: number;
  longitude: number;
};

type Props = {
  visible: boolean;
  region: Region;
  marker: MarkerPosition | null;
  locationLoading: boolean;
  mapLoading: boolean;
  selectedLocation: string;
  onClose: () => void;
  onMapPress: (
    latitude: number,
    longitude: number,
  ) => void | Promise<void>;
  onCurrentLocation: () => void | Promise<void>;
  onConfirm: () => void;
};

export default function JobMap({
  visible,
  region,
  marker,
  locationLoading,
  mapLoading,
  selectedLocation,
  onClose,
  onMapPress,
  onCurrentLocation,
  onConfirm,
}: Props) {
  const handleMapPress = (
    event: MapPressEvent,
  ) => {
    const coordinate =
      event.nativeEvent.coordinate;

    void onMapPress(
      coordinate.latitude,
      coordinate.longitude,
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={
          styles.container
        }
      >
        {/* HEADER */}
        <View
          style={
            styles.header
          }
        >
          <Pressable
            onPress={onClose}
            style={
              styles.closeButton
            }
          >
            <Text
              style={
                styles.closeText
              }
            >
              ✕
            </Text>
          </Pressable>

          <View
            style={
              styles.headerCenter
            }
          >
            <Text
              style={
                styles.title
              }
            >
              Choose location
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Tap the map to move the marker
            </Text>
          </View>

          <View
            style={
              styles.headerSpacer
            }
          />
        </View>

        {/* MAP */}
        <View
          style={
            styles.mapWrapper
          }
        >
          <MapView
            style={
              StyleSheet.absoluteFillObject
            }
            region={region}
            onPress={
              handleMapPress
            }
            showsUserLocation={false}
            showsMyLocationButton={false}
            loadingEnabled
          >
            {marker ? (
              <Marker
                coordinate={{
                  latitude:
                    marker.latitude,
                  longitude:
                    marker.longitude,
                }}
                title="Selected location"
                description={
                  selectedLocation ||
                  "Job location"
                }
              />
            ) : null}
          </MapView>

          {/* HINT */}
          <View
            pointerEvents="none"
            style={
              styles.hintWrapper
            }
          >
            <Text
              style={
                styles.hint
              }
            >
              📍 Tap anywhere to select
            </Text>
          </View>

          {/* LOADING */}
          {mapLoading ? (
            <View
              style={
                styles.loadingOverlay
              }
            >
              <ActivityIndicator
                size="large"
                color="#2563eb"
              />

              <Text
                style={
                  styles.loadingText
                }
              >
                Getting address…
              </Text>
            </View>
          ) : null}
        </View>

        {/* BOTTOM */}
        <View
          style={
            styles.bottom
          }
        >
          <Text
            style={
              styles.selectedLabel
            }
          >
            SELECTED LOCATION
          </Text>

          <Text
            style={
              styles.selectedText
            }
            numberOfLines={3}
          >
            {selectedLocation ||
              "Tap on the map or use Current Location."}
          </Text>

          <View
            style={
              styles.buttons
            }
          >
            <Pressable
              onPress={
                onCurrentLocation
              }
              disabled={
                locationLoading
              }
              style={[
                styles.currentButton,
                locationLoading &&
                  styles.disabled,
              ]}
            >
              {locationLoading ? (
                <ActivityIndicator
                  color="#ffffff"
                />
              ) : (
                <Text
                  style={
                    styles.buttonText
                  }
                >
                  ◎ CURRENT LOCATION
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={!marker}
              style={[
                styles.confirmButton,
                !marker &&
                  styles.confirmDisabled,
              ]}
            >
              <Text
                style={
                  styles.buttonText
                }
              >
                ✓ USE THIS LOCATION
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  header: {
    minHeight: 76,
    paddingTop: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },

  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },

  closeText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 10,
  },

  headerSpacer: {
    width: 44,
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  subtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#64748b",
  },

  mapWrapper: {
    flex: 1,
    position: "relative",
  },

  hintWrapper: {
    position: "absolute",
    top: 14,
    left: 20,
    right: 20,
    alignItems: "center",
  },

  hint: {
    backgroundColor:
      "rgba(17,24,39,0.88)",
    color: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "700",
  },

  loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      "rgba(255,255,255,0.45)",
  },

  loadingText: {
    marginTop: 8,
    color: "#111827",
    fontWeight: "700",
  },

  bottom: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },

  selectedLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },

  selectedText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    marginTop: 5,
    minHeight: 40,
  },

  buttons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  currentButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  confirmButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  confirmDisabled: {
    backgroundColor: "#94a3b8",
  },

  disabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
});