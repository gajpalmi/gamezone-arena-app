import React from "react";

import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

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

/**
 * WEB SAFE MAP FALLBACK
 *
 * IMPORTANT:
 * Do NOT import react-native-maps here.
 *
 * Replit Web uses Expo Web, so this file is
 * selected instead of JobMap.native.tsx.
 */
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
              Web preview
            </Text>
          </View>

          <View
            style={
              styles.headerSpacer
            }
          />
        </View>

        {/* WEB MAP FALLBACK */}
        <View
          style={
            styles.webMap
          }
        >
          <Text
            style={
              styles.mapIcon
            }
          >
            🗺️
          </Text>

          <Text
            style={
              styles.webTitle
            }
          >
            Map available in Android app
          </Text>

          <Text
            style={
              styles.webText
            }
          >
            The interactive native map is
            disabled in Replit Web preview
            to prevent native-module
            bundling errors.
          </Text>

          <Text
            style={
              styles.webText
            }
          >
            Use Location Search or Current
            Location in the Android app.
          </Text>

          {mapLoading ? (
            <View
              style={
                styles.loading
              }
            >
              <ActivityIndicator
                size="small"
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

          {marker ? (
            <View
              style={
                styles.markerInfo
              }
            >
              <Text
                style={
                  styles.markerTitle
                }
              >
                📍 Location selected
              </Text>

              <Text
                style={
                  styles.markerText
                }
              >
                Latitude:{" "}
                {marker.latitude.toFixed(6)}
              </Text>

              <Text
                style={
                  styles.markerText
                }
              >
                Longitude:{" "}
                {marker.longitude.toFixed(6)}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={() =>
              void onCurrentLocation()
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
                ◎ USE CURRENT LOCATION
              </Text>
            )}
          </Pressable>
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
              "Use Location Search or Current Location."}
          </Text>

          <View
            style={
              styles.buttons
            }
          >
            <Pressable
              onPress={onClose}
              style={
                styles.cancelButton
              }
            >
              <Text
                style={
                  styles.buttonTextDark
                }
              >
                CLOSE
              </Text>
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

  webMap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    backgroundColor: "#f8fafc",
  },

  mapIcon: {
    fontSize: 54,
    marginBottom: 18,
  },

  webTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },

  webText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: "#64748b",
    textAlign: "center",
    maxWidth: 480,
  },

  loading: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    gap: 8,
  },

  loadingText: {
    color: "#111827",
    fontWeight: "700",
  },

  markerInfo: {
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    width: "100%",
    maxWidth: 420,
  },

  markerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 5,
  },

  markerText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },

  currentButton: {
    marginTop: 20,
    minHeight: 48,
    width: "100%",
    maxWidth: 420,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  disabled: {
    opacity: 0.6,
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

  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },

  confirmButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
  },

  confirmDisabled: {
    backgroundColor: "#94a3b8",
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },

  buttonTextDark: {
    color: "#111827",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
});