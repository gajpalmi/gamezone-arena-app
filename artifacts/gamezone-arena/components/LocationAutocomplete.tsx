import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as Location from "expo-location";
import { Feather } from "@/components/Feather";
import colors from "@/constants/colors";

export type SelectedLocation = {
  address: string;
  city: string;
  area: string;
  latitude: number;
  longitude: number;
};

type SearchResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    suburb?: string;
    neighbourhood?: string;
    residential?: string;
    state_district?: string;
    state?: string;
  };
};

async function reverseGeocodeWeb(latitude: number, longitude: number): Promise<SelectedLocation> {
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`, {
    headers: { "Accept-Language": "en-IN,hi-IN;q=0.9,en;q=0.8" },
  });
  if (!response.ok) throw new Error(`Reverse geocoding returned ${response.status}`);
  const result = await response.json() as SearchResult;
  return normalize({ ...result, lat: String(latitude), lon: String(longitude) });
}

type Props = {
  value: string;
  error?: string;
  onChangeText: (value: string) => void;
  onSelect: (location: SelectedLocation) => void;
};

function normalize(result: SearchResult): SelectedLocation {
  const address = result.address ?? {};
  return {
    address: result.display_name,
    city: address.city || address.town || address.village || address.municipality || address.county || "",
    area: address.suburb || address.neighbourhood || address.residential || address.state_district || "",
    latitude: Number(result.lat),
    longitude: Number(result.lon),
  };
}

export function LocationAutocomplete({ value, error, onChangeText, onSelect }: Props) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [focused, setFocused] = useState(false);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    const query = value.trim();
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    if (!focused || query.length < 3) {
      setResults([]);
      setMessage("");
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setMessage("");
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=in&limit=5&q=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { "Accept-Language": "en-IN,hi-IN;q=0.9,en;q=0.8" },
        });
        if (!response.ok) throw new Error(`Location search returned ${response.status}`);
        const data = await response.json() as SearchResult[];
        setResults(data);
        if (!data.length) setMessage("No matching location found. You can still enter the address manually.");
      } catch (searchError) {
        if ((searchError as Error).name !== "AbortError") {
          console.error("Location search failed", searchError);
          setMessage("Location suggestions are unavailable. Enter the address manually.");
        }
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [focused, value]);

  const choose = (result: SearchResult) => {
    const location = normalize(result);
    skipNextSearch.current = true;
    setFocused(false);
    setResults([]);
    setMessage("");
    onSelect(location);
  };

  const useCurrentLocation = async () => {
    setLoading(true);
    setMessage("");
    try {
      if (Platform.OS === "web") {
        if (!globalThis.navigator?.geolocation) {
          setMessage("This browser does not support current location. Search or enter the address manually.");
          return;
        }
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          globalThis.navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 15_000,
            maximumAge: 60_000,
          });
        });
        const selected = await reverseGeocodeWeb(position.coords.latitude, position.coords.longitude);
        skipNextSearch.current = true;
        setFocused(false);
        setResults([]);
        onSelect(selected);
        return;
      }
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setMessage(permission.canAskAgain === false
          ? "Location permission is blocked. Open app settings to allow access, or enter the address manually."
          : "Location permission was not granted. Search or enter the address manually.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [address] = await Location.reverseGeocodeAsync(position.coords);
      const selected: SelectedLocation = {
        address: [
          address?.name,
          address?.street,
          address?.district,
          address?.city,
          address?.region,
          address?.postalCode,
        ].filter(Boolean).join(", "),
        city: address?.city || address?.subregion || address?.region || "",
        area: address?.district || address?.street || "",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      skipNextSearch.current = true;
      setFocused(false);
      setResults([]);
      onSelect(selected);
    } catch (locationError) {
      console.error("Current location lookup failed", locationError);
      setMessage("Current location could not be detected. Search or enter it manually.");
    } finally {
      setLoading(false);
    }
  };

  return <View style={styles.root}>
    <Text style={styles.label}>LOCATION SEARCH</Text>
    <View style={[styles.inputRow, error && styles.inputError]}>
      <Feather name="map-pin" size={18} color={error ? colors.light.destructive : colors.light.primary}/>
      <TextInput
        style={styles.input}
        value={value}
        placeholder="Search area, city, landmark or address"
        placeholderTextColor={colors.light.mutedForeground}
        onFocus={() => setFocused(true)}
        onChangeText={text => {
          setFocused(true);
          onChangeText(text);
        }}
      />
      {loading ? <ActivityIndicator size="small" color={colors.light.primary}/> : null}
    </View>
    {error ? <Text style={styles.error}>↑ {error}</Text> : null}
    <Pressable style={styles.currentButton} onPress={() => void useCurrentLocation()} disabled={loading}>
      <Feather name="crosshair" size={16} color={colors.light.primary}/>
      <Text style={styles.currentText}>USE CURRENT LOCATION</Text>
    </Pressable>
    {Platform.OS !== "web" && message.includes("Open app settings") ? <Pressable style={styles.settingsButton} onPress={() => void Linking.openSettings()}>
      <Text style={styles.currentText}>OPEN APP SETTINGS</Text>
    </Pressable> : null}
    {message ? <Text style={styles.message}>{message}</Text> : null}
    {focused && results.length ? <View style={styles.results}>
      {results.map(result => <Pressable key={result.place_id} style={styles.result} onPress={() => choose(result)}>
        <Feather name="map-pin" size={16} color={colors.light.primary}/>
        <Text numberOfLines={3} style={styles.resultText}>{result.display_name}</Text>
      </Pressable>)}
      <Text style={styles.attribution}>Location results © OpenStreetMap contributors</Text>
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { marginBottom: 14, zIndex: 10 },
  label: { color: colors.light.mutedForeground, fontWeight: "700", fontSize: 11, marginBottom: 6 },
  inputRow: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: colors.light.card, borderColor: colors.light.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13 },
  inputError: { borderColor: colors.light.destructive, borderWidth: 2 },
  input: { flex: 1, color: colors.light.foreground, paddingVertical: 13 },
  currentButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 10 },
  settingsButton: { alignSelf: "flex-start", paddingBottom: 8 },
  currentText: { color: colors.light.primary, fontSize: 12, fontWeight: "900" },
  results: { borderWidth: 1, borderColor: colors.light.border, borderRadius: 12, backgroundColor: colors.light.card, overflow: "hidden" },
  result: { flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.light.border },
  resultText: { flex: 1, color: colors.light.foreground, fontSize: 13, lineHeight: 18 },
  attribution: { color: colors.light.mutedForeground, fontSize: 10, padding: 8, textAlign: "right" },
  message: { color: colors.light.mutedForeground, fontSize: 12, marginBottom: 6 },
  error: { color: colors.light.destructive, fontSize: 12, fontWeight: "700", marginTop: 4 },
});