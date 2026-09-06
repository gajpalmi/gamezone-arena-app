import React from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import colors from "@/constants/colors";
import { useSavedOfferings } from "@/hooks/useOfferings";
import { useSupabaseAuth } from "@/hooks/useBusiness";

export default function Saved() {
  const auth = useSupabaseAuth();
  const router = useRouter();
  const { data, error, isLoading, refetch } = useSavedOfferings(auth.ready);
  if (!auth.isLoaded || (auth.isSignedIn && !auth.ready) || isLoading) return <View style={[s.root, s.center]}><ActivityIndicator color={colors.light.primary}/></View>;
  return <View style={s.root}>
    <Text style={s.title}>Saved listings</Text>
    {!auth.isSignedIn ? <View style={s.state}><Text style={s.empty}>Sign in to see your saved listings.</Text><Pressable style={s.action} onPress={() => router.push("/sign-in" as never)}><Text style={s.actionText}>SIGN IN</Text></Pressable></View>
      : error ? <View style={s.state}><Text style={s.empty}>{error instanceof Error ? error.message : "Unable to load saved listings."}</Text><Pressable style={s.action} onPress={() => void refetch()}><Text style={s.actionText}>RETRY</Text></Pressable></View>
      : <FlatList data={data ?? []} keyExtractor={item => item.id} contentContainerStyle={s.list} ListEmptyComponent={<Text style={s.empty}>Save products and services to find them here.</Text>} renderItem={({ item }) => <Pressable style={s.card} onPress={() => router.push(`/business/offering/${item.id}` as never)}><Text style={s.name}>{item.name}</Text><Text style={s.meta}>{item.kind} · {item.city}</Text></Pressable>}/>}
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light.background, padding: 20 },
  center: { alignItems: "center", justifyContent: "center" },
  title: { color: colors.light.foreground, fontSize: 22, fontWeight: "900", marginBottom: 16 },
  list: { paddingBottom: 40 },
  card: { backgroundColor: colors.light.card, padding: 15, borderRadius: 12, marginBottom: 10 },
  name: { color: colors.light.foreground, fontWeight: "800" },
  meta: { color: colors.light.mutedForeground, fontSize: 12, marginTop: 4 },
  empty: { color: colors.light.mutedForeground, textAlign: "center", marginTop: 40 },
  state: { alignItems: "center", gap: 12 },
  action: { backgroundColor: colors.light.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11 },
  actionText: { color: colors.light.primaryForeground, fontWeight: "900" },
});