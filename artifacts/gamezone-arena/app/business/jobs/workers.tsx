import React, { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { CategoryPicker } from "@/components/CategoryPicker";
import { Button, styles as s } from "@/components/JobsUi";
import { useJobCategories, useWorkers } from "@/hooks/useJobs";
import type { WorkType } from "@/lib/jobs";

const workTypes: [WorkType, string][] = [["full_time", "Full time"], ["part_time", "Part time"], ["temporary", "Temporary"], ["contract", "Contract"], ["internship", "Internship"], ["freelance", "Freelance"]];
const number = (value: string) => value.trim() !== "" && Number.isFinite(Number(value)) ? Number(value) : undefined;
type DraftFilters = { query: string; role: string; skills: string; city: string; area: string; minExperience: string; maxExperience: string; minSalary: string; maxSalary: string; categoryId?: string; workType?: WorkType; available: boolean };
const initialFilters: DraftFilters = { query: "", role: "", skills: "", city: "", area: "", minExperience: "", maxExperience: "", minSalary: "", maxSalary: "", categoryId: undefined, workType: undefined, available: false };

export default function Workers() {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftFilters>(initialFilters);
  const [submitted, setSubmitted] = useState<DraftFilters>(initialFilters);
  const categories = useJobCategories();
  const workers = useWorkers({ query: submitted.query, role: submitted.role, skills: submitted.skills, city: submitted.city, area: submitted.area, categoryId: submitted.categoryId, workType: submitted.workType, minExperience: number(submitted.minExperience), maxExperience: number(submitted.maxExperience), minSalary: number(submitted.minSalary), maxSalary: number(submitted.maxSalary), available: submitted.available });
  const update = <Key extends keyof DraftFilters>(key: Key, value: DraftFilters[Key]) => setDraft(current => ({ ...current, [key]: value }));
  const apply = () => setSubmitted({ ...draft });
  const chip = (label: string, onPress: () => void, active = false) => <Pressable style={[s.card, active && { borderColor: s.buttonText.color }]} onPress={onPress}><Text style={s.meta}>{active ? "✓ " : ""}{label}</Text></Pressable>;

  const header = <><Text style={s.title}>Find Workers</Text><Text style={s.subtitle}>Only public, active worker profiles appear here. Apply filters to search.</Text>
    <TextInput style={s.input} value={draft.query} onChangeText={value => update("query", value)} onSubmitEditing={apply} returnKeyType="search" placeholder="Name or role" placeholderTextColor={s.subtitle.color} />
    <TextInput style={s.input} value={draft.role} onChangeText={value => update("role", value)} placeholder="Job role" placeholderTextColor={s.subtitle.color} />
    <TextInput style={s.input} value={draft.skills} onChangeText={value => update("skills", value)} placeholder="Skills (comma separated)" placeholderTextColor={s.subtitle.color} />
    <TextInput style={s.input} value={draft.city} onChangeText={value => update("city", value)} placeholder="City" placeholderTextColor={s.subtitle.color} />
    <TextInput style={s.input} value={draft.area} onChangeText={value => update("area", value)} placeholder="Area" placeholderTextColor={s.subtitle.color} />
    <View style={s.row}><TextInput style={[s.input, { flex: 1 }]} value={draft.minExperience} keyboardType="numeric" onChangeText={value => update("minExperience", value)} placeholder="Min experience (months)" placeholderTextColor={s.subtitle.color} /><TextInput style={[s.input, { flex: 1 }]} value={draft.maxExperience} keyboardType="numeric" onChangeText={value => update("maxExperience", value)} placeholder="Max experience (months)" placeholderTextColor={s.subtitle.color} /></View>
    <View style={s.row}><TextInput style={[s.input, { flex: 1 }]} value={draft.minSalary} keyboardType="numeric" onChangeText={value => update("minSalary", value)} placeholder="Expected min salary" placeholderTextColor={s.subtitle.color} /><TextInput style={[s.input, { flex: 1 }]} value={draft.maxSalary} keyboardType="numeric" onChangeText={value => update("maxSalary", value)} placeholder="Expected max salary" placeholderTextColor={s.subtitle.color} /></View>
    <CategoryPicker categories={categories.data ?? []} selectedId={draft.categoryId} onChoose={category => update("categoryId", category.id)} loading={categories.isLoading} error={categories.error} onRetry={() => categories.refetch()} />
    <Text style={s.label}>Work type</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginVertical: 8 }}>{chip("Any", () => update("workType", undefined), !draft.workType)}{workTypes.map(([value, label]) => <React.Fragment key={value}>{chip(label, () => update("workType", value), draft.workType === value)}</React.Fragment>)}</ScrollView>
    {chip("Available now", () => update("available", !draft.available), draft.available)}<Button label="Apply filters" kind onPress={apply} /></>;

  if (workers.isLoading) return <View style={[s.root, { padding: 20 }]}><ActivityIndicator /><View>{header}</View></View>;
  return <View style={[s.root, { padding: 20 }]}>{workers.error ? <View>{header}<Text style={s.empty}>{(workers.error as Error).message}</Text><Button label="Retry search" onPress={() => workers.refetch()} /></View> : <FlatList data={workers.data ?? []} keyExtractor={item => item.id} contentContainerStyle={{ gap: 10, paddingBottom: 30 }} ListHeaderComponent={header} ListEmptyComponent={<Text style={s.empty}>No public worker profiles match these filters.</Text>} renderItem={({ item }) => <Pressable style={s.card} onPress={() => router.push(`/business/jobs/workers/${item.id}` as never)}><Text style={s.name}>{item.display_name}</Text><Text style={s.meta}>{item.category ?? "Uncategorized"} · {item.role ?? item.job_role ?? "Worker"}{"\n"}{item.skills.join(", ")} · {[item.area, item.city].filter(Boolean).join(", ")}</Text></Pressable>} />}</View>;
}