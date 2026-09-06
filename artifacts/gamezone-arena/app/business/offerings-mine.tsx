import React from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import colors from "@/constants/colors";
import { useSupabaseAuth } from "@/hooks/useBusiness";
import { useMyOfferings, useOfferingAction } from "@/hooks/useOfferings";
import { offeringLink, shareLink } from "@/lib/share";

export default function Mine() {
  useSupabaseAuth();
  const router = useRouter();
  const { data, isLoading, error } = useMyOfferings();
  const action = useOfferingAction();

  if (isLoading) return <View style={styles.root}><ActivityIndicator color={colors.light.primary}/></View>;

  return <View style={styles.root}>
    <Text style={styles.title}>My Product & Service Listings</Text>
    <Text style={styles.subtitle}>Saved drafts and published listings appear here.</Text>
    <Pressable testID="add-product" style={styles.add} onPress={() => router.push("/business/offering/edit?kind=product" as never)}>
      <Text style={styles.buttonText}>+ ADD PRODUCT</Text>
    </Pressable>
    <Pressable testID="add-service" style={styles.add} onPress={() => router.push("/business/offering/edit?kind=service" as never)}>
      <Text style={styles.buttonText}>+ ADD SERVICE</Text>
    </Pressable>
    <FlatList
      data={data ?? []}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<Text style={styles.empty}>{error ? (error as Error).message : "You have no saved product or service listings."}</Text>}
      renderItem={({ item }) => <View style={styles.card}>
        <Text style={styles.intent}>
          {item.kind === "product" ? item.listing_intent === "buy" ? "WANT TO BUY" : "FOR SALE" : "SERVICE"}
        </Text>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>{item.kind} · {item.status}{item.is_enabled ? "" : " · disabled"}</Text>
        <View style={styles.row}>
          <Pressable onPress={() => router.push(`/business/offering/${item.id}` as never)}><Text style={styles.link}>VIEW</Text></Pressable>
          <Pressable onPress={() => router.push(`/business/offering/edit?id=${item.id}` as never)}><Text style={styles.link}>EDIT</Text></Pressable>
          <Pressable
            testID="toggle-offering-enabled"
            onPress={() => action.mutate({ type: "enable", id: item.id, value: !item.is_enabled }, { onError: () => Alert.alert("Could not update", "Please try again.") })}
          ><Text style={styles.link}>{item.is_enabled ? "DISABLE" : "ENABLE"}</Text></Pressable>
          {["draft", "rejected"].includes(item.status) ? <Pressable
            onPress={() => action.mutate({ type: "submit", id: item.id }, {
              onSuccess: () => Alert.alert("Submitted", "Your listing is pending moderation."),
              onError: () => Alert.alert("Cannot submit", "Open Edit and complete all required information."),
            })}
          ><Text style={styles.link}>SUBMIT</Text></Pressable> : null}
          <Pressable onPress={() => void shareLink(item.name, offeringLink(item.id))}><Text style={styles.link}>SHARE</Text></Pressable>
          {["draft", "rejected"].includes(item.status) ? <Pressable onPress={() => Alert.alert("Delete listing", "This cannot be undone.", [
            { text: "Cancel" },
            { text: "Delete", style: "destructive", onPress: () => action.mutate({ type: "delete", id: item.id }) },
          ])}><Text style={styles.danger}>DELETE</Text></Pressable> : null}
        </View>
      </View>}
    />
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light.background, padding: 20, gap: 10 },
  title: { color: colors.light.foreground, fontSize: 22, fontWeight: "900" },
  subtitle: { color: colors.light.mutedForeground, marginBottom: 4 },
  add: { backgroundColor: colors.light.primary, borderRadius: 12, padding: 15, alignItems: "center" },
  buttonText: { color: colors.light.primaryForeground, fontWeight: "900" },
  list: { gap: 10, paddingTop: 8, paddingBottom: 40 },
  card: { backgroundColor: colors.light.card, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.light.border },
  intent: { color: colors.light.primary, fontSize: 11, fontWeight: "900", marginBottom: 4 },
  name: { color: colors.light.foreground, fontWeight: "800", fontSize: 17 },
  meta: { color: colors.light.mutedForeground, fontSize: 12, marginVertical: 6 },
  row: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  link: { color: colors.light.primary, fontWeight: "800", fontSize: 11 },
  danger: { color: colors.light.destructive, fontWeight: "800", fontSize: 11 },
  empty: { color: colors.light.mutedForeground, textAlign: "center", marginTop: 45 },
});