import React, { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { CategoryPicker } from "@/components/CategoryPicker";
import { Button, styles as s } from "@/components/JobsUi";
import { useJobCategories, useWorkers } from "@/hooks/useJobs";
import type { WorkType } from "@/lib/jobs";
import colors from "@/constants/colors";

const workTypes: [WorkType, string][] = [["full_time", "Full time"], ["part_time", "Part time"], ["temporary", "Temporary"], ["contract", "Contract"], ["internship", "Internship"], ["freelance", "Freelance"]];
const number = (value: string) => value.trim() !== "" && Number.isFinite(Number(value)) ? Number(value) : undefined;
type DraftFilters = { query: string; role: string; skills: string; city: string; area: string; minExperience: string; maxExperience: string; minSalary: string; maxSalary: string; categoryId?: string; workType?: WorkType; available: boolean };
const initialFilters: DraftFilters = { query: "", role: "", skills: "", city: "", area: "", minExperience: "", maxExperience: "", minSalary: "", maxSalary: "", categoryId: undefined, workType: undefined, available: false };

export default function Workers() {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftFilters>(initialFilters);
  const [submitted, setSubmitted] = useState<DraftFilters>(initialFilters);
  const [errors, setErrors] = useState<Partial<Record<keyof DraftFilters, string>>>({});
  const categories = useJobCategories();
  const workers = useWorkers({ query: submitted.query, role: submitted.role, skills: submitted.skills, city: submitted.city, area: submitted.area, categoryId: submitted.categoryId, workType: submitted.workType, minExperience: number(submitted.minExperience), maxExperience: number(submitted.maxExperience), minSalary: number(submitted.minSalary), maxSalary: number(submitted.maxSalary), available: submitted.available });
  const update = <Key extends keyof DraftFilters>(key: Key, value: DraftFilters[Key]) => {
    setDraft(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
  };
  const apply = () => {
    const next: Partial<Record<keyof DraftFilters, string>> = {};
    const numericFields: [keyof DraftFilters, string][] = [
      ["minExperience", "Minimum experience must be 0 or more."],
      ["maxExperience", "Maximum experience must be 0 or more."],
      ["minSalary", "Minimum salary must be 0 or more."],
      ["maxSalary", "Maximum salary must be 0 or more."],
    ];
    numericFields.forEach(([key, message]) => {
      const value = String(draft[key] ?? "").trim();
      if (value && (!Number.isFinite(Number(value)) || Number(value) < 0)) next[key] = message;
    });
    const minExperience = number(draft.minExperience);
    const maxExperience = number(draft.maxExperience);
    const minSalary = number(draft.minSalary);
    const maxSalary = number(draft.maxSalary);
    if (minExperience != null && maxExperience != null && minExperience > maxExperience) {
      next.minExperience = "Minimum experience cannot be greater than maximum experience.";
      next.maxExperience = "Maximum experience must be equal to or greater than minimum experience.";
    }
    if (minSalary != null && maxSalary != null && minSalary > maxSalary) {
      next.minSalary = "Minimum salary cannot be greater than maximum salary.";
      next.maxSalary = "Maximum salary must be equal to or greater than minimum salary.";
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitted({ ...draft });
  };
  const chip = (label: string, onPress: () => void, active = false) => <Pressable style={[s.card, active && { borderColor: s.buttonText.color }]} onPress={onPress}><Text style={s.meta}>{active ? "✓ " : ""}{label}</Text></Pressable>;

  const header = <><Text style={s.title}>Find Workers</Text><Text style={s.subtitle}>Only public, active worker profiles appear here. Apply filters to search.</Text>
    <TextInput style={s.input} value={draft.query} onChangeText={value => update("query", value)} onSubmitEditing={apply} returnKeyType="search" placeholder="Name or role" placeholderTextColor={s.subtitle.color} />
    <TextInput style={s.input} value={draft.role} onChangeText={value => update("role", value)} placeholder="Job role" placeholderTextColor={s.subtitle.color} />
    <TextInput style={s.input} value={draft.skills} onChangeText={value => update("skills", value)} placeholder="Skills (comma separated)" placeholderTextColor={s.subtitle.color} />
    <TextInput style={s.input} value={draft.city} onChangeText={value => update("city", value)} placeholder="City" placeholderTextColor={s.subtitle.color} />
    <TextInput style={s.input} value={draft.area} onChangeText={value => update("area", value)} placeholder="Area" placeholderTextColor={s.subtitle.color} />
    <View style={s.row}><View style={local.half}><TextInput style={[s.input, errors.minExperience && local.invalid]} value={draft.minExperience} keyboardType="numeric" onChangeText={value => update("minExperience", value)} placeholder="Min experience (months)" placeholderTextColor={s.subtitle.color} />{errors.minExperience?<Text style={local.error}>{errors.minExperience}</Text>:null}</View><View style={local.half}><TextInput style={[s.input, errors.maxExperience && local.invalid]} value={draft.maxExperience} keyboardType="numeric" onChangeText={value => update("maxExperience", value)} placeholder="Max experience (months)" placeholderTextColor={s.subtitle.color} />{errors.maxExperience?<Text style={local.error}>{errors.maxExperience}</Text>:null}</View></View>
    <View style={s.row}><View style={local.half}><TextInput style={[s.input, errors.minSalary && local.invalid]} value={draft.minSalary} keyboardType="numeric" onChangeText={value => update("minSalary", value)} placeholder="Expected min salary" placeholderTextColor={s.subtitle.color} />{errors.minSalary?<Text style={local.error}>{errors.minSalary}</Text>:null}</View><View style={local.half}><TextInput style={[s.input, errors.maxSalary && local.invalid]} value={draft.maxSalary} keyboardType="numeric" onChangeText={value => update("maxSalary", value)} placeholder="Expected max salary" placeholderTextColor={s.subtitle.color} />{errors.maxSalary?<Text style={local.error}>{errors.maxSalary}</Text>:null}</View></View>
    <CategoryPicker categories={categories.data ?? []} selectedId={draft.categoryId} onChoose={category => update("categoryId", category.id)} loading={categories.isLoading} error={categories.error} onRetry={() => categories.refetch()} />
    <Text style={s.label}>Work type</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginVertical: 8 }}>{chip("Any", () => update("workType", undefined), !draft.workType)}{workTypes.map(([value, label]) => <React.Fragment key={value}>{chip(label, () => update("workType", value), draft.workType === value)}</React.Fragment>)}</ScrollView>
    {chip("Available now", () => update("available", !draft.available), draft.available)}<Button label="SEARCH WORKERS" kind onPress={apply} /><Text style={local.help}>Search results appear below on this same screen.</Text></>;

  if (workers.isLoading) return <View style={[s.root, { padding: 20 }]}><ActivityIndicator /><View>{header}</View></View>;
  return <View style={[s.root, { padding: 20 }]}>{workers.error ? <View>{header}<Text style={s.empty}>{(workers.error as Error).message}</Text><Button label="Retry search" onPress={() => workers.refetch()} /></View> : <FlatList data={workers.data ?? []} keyExtractor={item => item.id} contentContainerStyle={{ gap: 10, paddingBottom: 30 }} ListHeaderComponent={header} ListEmptyComponent={<Text style={s.empty}>No public worker profiles match these filters.</Text>} renderItem={({ item }) => <Pressable style={s.card} onPress={() => router.push(`/business/jobs/workers/${item.id}` as never)}><Text style={s.name}>{item.display_name}</Text><Text style={s.meta}>{item.category ?? "Uncategorized"} · {item.role ?? item.job_role ?? "Worker"}{"\n"}{item.skills.join(", ")} · {[item.area, item.city].filter(Boolean).join(", ")}</Text></Pressable>} />}</View>;
}

const local = StyleSheet.create({
  half:{flex:1,gap:4},
  invalid:{borderColor:colors.light.destructive,borderWidth:2},
  error:{color:colors.light.destructive,fontSize:11,fontWeight:"700",lineHeight:15},
  help:{color:colors.light.mutedForeground,fontSize:11,textAlign:"center",marginTop:4},
});