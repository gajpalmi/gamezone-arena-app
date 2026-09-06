import React, { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { CategoryPicker } from "@/components/CategoryPicker";
import { Button, Card, styles as s } from "@/components/JobsUi";
import { useJobCategories, useJobs } from "@/hooks/useJobs";
import type { WorkType, WorkplaceType } from "@/lib/jobs";

const workTypes: [WorkType, string][] = [["full_time", "Full time"], ["part_time", "Part time"], ["temporary", "Temporary"], ["contract", "Contract"], ["internship", "Internship"], ["freelance", "Freelance"]];
const workplaces: [WorkplaceType, string][] = [["on_site", "On-site"], ["remote", "Remote"], ["hybrid", "Hybrid"]];
const number = (value: string) => value.trim() !== "" && Number.isFinite(Number(value)) ? Number(value) : undefined;

type DraftFilters = {
  query: string; city: string; area: string; education: string; minSalary: string; maxSalary: string;
  minExperience: string; maxExperience: string; categoryId?: string; workType?: WorkType;
  workplaceType?: WorkplaceType; recent: boolean;
};

const initialFilters: DraftFilters = {
  query: "", city: "", area: "", education: "", minSalary: "", maxSalary: "",
  minExperience: "", maxExperience: "", categoryId: undefined, workType: undefined,
  workplaceType: undefined, recent: false,
};

export default function Discover() {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftFilters>(initialFilters);
  const [submitted, setSubmitted] = useState<DraftFilters>(initialFilters);
  const categories = useJobCategories();
  const jobs = useJobs({
    query: submitted.query,
    city: submitted.city,
    area: submitted.area,
    education: submitted.education,
    categoryId: submitted.categoryId,
    workType: submitted.workType,
    workplaceType: submitted.workplaceType,
    minSalary: number(submitted.minSalary),
    maxSalary: number(submitted.maxSalary),
    minExperience: number(submitted.minExperience),
    maxExperience: number(submitted.maxExperience),
    recent: submitted.recent,
  });

  const update = <Key extends keyof DraftFilters>(key: Key, value: DraftFilters[Key]) =>
    setDraft(current => ({ ...current, [key]: value }));
  const apply = () => setSubmitted({ ...draft });
  const chip = (label: string, onPress: () => void, active = false) => (
    <Pressable style={[s.card, active && { borderColor: s.buttonText.color }]} onPress={onPress}>
      <Text style={s.meta}>{active ? "✓ " : ""}{label}</Text>
    </Pressable>
  );

  const header = (
    <>
      <Text style={s.title}>Find Jobs</Text>
      <Text style={s.subtitle}>Search approved jobs, then apply your selected filters.</Text>
      <TextInput
        value={draft.query}
        onChangeText={value => update("query", value)}
        onSubmitEditing={apply}
        returnKeyType="search"
        placeholder="Title, company, or role"
        placeholderTextColor={s.subtitle.color}
        style={s.input}
      />
      <TextInput value={draft.city} onChangeText={value => update("city", value)} placeholder="City" placeholderTextColor={s.subtitle.color} style={s.input} />
      <TextInput value={draft.area} onChangeText={value => update("area", value)} placeholder="Area" placeholderTextColor={s.subtitle.color} style={s.input} />
      <View style={s.row}>
        <TextInput value={draft.minSalary} keyboardType="numeric" onChangeText={value => update("minSalary", value)} placeholder="Min salary" placeholderTextColor={s.subtitle.color} style={[s.input, { flex: 1 }]} />
        <TextInput value={draft.maxSalary} keyboardType="numeric" onChangeText={value => update("maxSalary", value)} placeholder="Max salary" placeholderTextColor={s.subtitle.color} style={[s.input, { flex: 1 }]} />
      </View>
      <View style={s.row}>
        <TextInput value={draft.minExperience} keyboardType="numeric" onChangeText={value => update("minExperience", value)} placeholder="Min experience (months)" placeholderTextColor={s.subtitle.color} style={[s.input, { flex: 1 }]} />
        <TextInput value={draft.maxExperience} keyboardType="numeric" onChangeText={value => update("maxExperience", value)} placeholder="Max experience (months)" placeholderTextColor={s.subtitle.color} style={[s.input, { flex: 1 }]} />
      </View>
      <TextInput value={draft.education} onChangeText={value => update("education", value)} placeholder="Education requirement" placeholderTextColor={s.subtitle.color} style={s.input} />
      <CategoryPicker categories={categories.data ?? []} selectedId={draft.categoryId} onChoose={category => update("categoryId", category.id)} loading={categories.isLoading} error={categories.error} onRetry={() => categories.refetch()} />
      <Text style={s.label}>Job type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginVertical: 8 }}>
        {chip("Any", () => update("workType", undefined), !draft.workType)}
        {workTypes.map(([value, label]) => <React.Fragment key={value}>{chip(label, () => update("workType", value), draft.workType === value)}</React.Fragment>)}
      </ScrollView>
      <Text style={s.label}>Workplace</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginVertical: 8 }}>
        {chip("Any", () => update("workplaceType", undefined), !draft.workplaceType)}
        {workplaces.map(([value, label]) => <React.Fragment key={value}>{chip(label, () => update("workplaceType", value), draft.workplaceType === value)}</React.Fragment>)}
      </ScrollView>
      {chip("Recent (last 7 days)", () => update("recent", !draft.recent), draft.recent)}
      <Button label="Apply filters" kind onPress={apply} />
    </>
  );

  if (jobs.isLoading) return <View style={[s.root, { padding: 20 }]}><ActivityIndicator /><View>{header}</View></View>;

  return (
    <View style={[s.root, { padding: 20 }]}>
      {jobs.error ? (
        <View>{header}<Text style={s.empty}>{(jobs.error as Error).message}</Text><Button label="Retry search" onPress={() => jobs.refetch()} /></View>
      ) : (
        <FlatList
          data={jobs.data ?? []}
          keyExtractor={item => item.id}
          ListHeaderComponent={header}
          contentContainerStyle={{ gap: 10, paddingBottom: 30 }}
          ListEmptyComponent={<Text style={s.empty}>No approved jobs match these filters.</Text>}
          renderItem={({ item }) => <Card job={item} onPress={() => router.push(`/business/jobs/${item.id}` as never)} />}
        />
      )}
    </View>
  );
}