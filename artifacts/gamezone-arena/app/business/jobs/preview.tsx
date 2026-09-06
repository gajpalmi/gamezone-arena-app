import React from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Button, Card, styles as s } from "@/components/JobsUi";
import { useSupabaseAuth } from "@/hooks/useBusiness";
import { useJob, useJobMutation } from "@/hooks/useJobs";

export default function Preview() {
  useSupabaseAuth();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { data, error, isLoading } = useJob(id ?? "");
  const mutation = useJobMutation();

  if (isLoading) return <ActivityIndicator />;
  if (!data) return <Text style={s.empty}>{error ? (error as Error).message : "Draft unavailable"}</Text>;

  const detail = (label: string, value: unknown) => value != null && String(value).trim() ? (
    <View>
      <Text style={s.label}>{label}</Text>
      <Text style={s.meta}>{String(value)}</Text>
    </View>
  ) : null;

  const publish = () => {
    if (mutation.isPending) return;
    mutation.mutate(
      { type: "submit", id: data.id },
      {
        onSuccess: () => {
          Alert.alert("Submitted", "Your job is pending moderation.");
          router.replace("/business/jobs/mine" as never);
        },
        onError: publishError => {
          console.error("Unable to publish job", publishError);
          Alert.alert("Could not submit", (publishError as Error).message);
        },
      },
    );
  };
  const returnToDraft = () => router.replace(`/business/jobs/edit?id=${data.id}` as never);

  return (
    <KeyboardAwareScrollViewCompat style={s.root} contentContainerStyle={s.content}>
      <Text style={s.title}>Preview Job Post</Text>
      <Text style={s.subtitle}>Review all entered information before submitting it for moderation.</Text>
      <Card job={data} onPress={() => {}} />
      <View style={s.card}>
        {detail("Contact person", data.employer_name)}
        {detail("Job role", data.job_role)}
        {detail("Description", data.description)}
        {detail("Responsibilities", data.responsibilities)}
        {detail("Required skills", data.required_skills.join(", "))}
        {detail("Required experience", data.required_experience_months == null ? null : `${data.required_experience_months} months`)}
        {detail("Education", data.education_requirement)}
        {detail("Work location", data.location_text)}
        {detail("Working hours", data.working_hours)}
        {detail("Weekly off", data.weekly_off)}
        {detail("Benefits", data.benefits)}
        {detail("Requirements", data.requirements)}
        {detail("Joining date", data.joining_date)}
      </View>
      <Text style={s.card}>Never pay money to get a job. GAMEZONE ARENA does not guarantee employment.</Text>
      <Button label="Edit" onPress={returnToDraft} />
      <Button kind label={mutation.isPending ? "Publishing…" : "Publish Job"} onPress={publish} />
      <Button label="Back" onPress={returnToDraft} />
    </KeyboardAwareScrollViewCompat>
  );
}