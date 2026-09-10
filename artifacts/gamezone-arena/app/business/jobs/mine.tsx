import React from "react";
import { ActivityIndicator, Alert, FlatList, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, styles as s } from "@/components/JobsUi";
import { useSupabaseAuth } from "@/hooks/useBusiness";
import { useJobMutation, useMyJobs } from "@/hooks/useJobs";

export default function Mine() {
  const auth = useSupabaseAuth();
  const router = useRouter();
  const { data, error, isLoading, refetch } = useMyJobs(auth.ready);
  const mutation = useJobMutation();

  const run = (value: Parameters<typeof mutation.mutate>[0], success: string) => {
    if (mutation.isPending) return;
    mutation.mutate(value, {
      onSuccess: () => Alert.alert("Updated", success),
      onError: (failure: Error) => Alert.alert("Could not update job", failure.message),
    });
  };

  if (!auth.isLoaded || (auth.isSignedIn && !auth.ready) || isLoading) {
    return <View style={[s.root, { padding: 20, justifyContent: "center" }]}><ActivityIndicator /></View>;
  }

  if (!auth.isSignedIn) {
    return <View style={[s.root, { padding: 20 }]}><Text style={s.title}>My Job Posts</Text><Text style={s.empty}>Sign in to manage your job posts.</Text><Button label="Sign in" kind onPress={() => router.push("/sign-in" as never)} /></View>;
  }

  return (
    <View style={[s.root, { padding: 20 }]}>
      <Text style={s.title}>My Job Posts</Text>
      <Button label="Post a job" kind onPress={() => router.push("/business/jobs/edit" as never)} />
      {error ? <View style={{ gap: 10 }}><Text style={s.empty}>{(error as Error).message}</Text><Button label="Retry" onPress={() => void refetch()} /></View> : <FlatList
        data={data ?? []}
        keyExtractor={item => item.id}
        contentContainerStyle={{ gap: 10, marginTop: 12 }}
        ListEmptyComponent={<Text style={s.empty}>No job posts yet.</Text>}
        renderItem={({ item }) => (
          <View style={{ gap: 6 }}>
            <Card job={item} onPress={() => router.push(`/business/jobs/${item.id}` as never)} />
            <Text style={s.meta}>Status: {item.status}</Text>
            <View style={s.row}>
              {["draft", "rejected"].includes(item.status) ? <Button label="Edit" onPress={() => router.push(`/business/jobs/edit?id=${item.id}` as never)} /> : null}
              <Button label="Applications" onPress={() => router.push(`/business/jobs/applications?jobId=${item.id}` as never)} />
              {["draft", "rejected"].includes(item.status) && (
                <Button label={mutation.isPending ? "Working…" : "Submit"} onPress={() => run({ type: "submit", id: item.id }, "Your job is pending moderation.")} />
              )}
              {["active", "paused"].includes(item.status) && (
                <Button
                  label={item.status === "active" ? "Pause" : "Resume"}
                  onPress={() => run({ type: "status", id: item.id, value: item.status === "active" ? "paused" : "active" }, item.status === "active" ? "The job is paused." : "The job is active.")}
                />
              )}
              {["active", "paused"].includes(item.status) ? <Button label="Close" onPress={() => run({ type: "status", id: item.id, value: "closed" }, "The job is closed.")} /> : null}
              {["draft", "rejected"].includes(item.status) ? <Button
                label="Delete"
                onPress={() => Alert.alert("Delete job", "This cannot be undone.", [
                  { text: "Cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => run({ type: "delete", id: item.id }, "The draft was deleted."),
                  },
                ])}
              /> : null}
            </View>
          </View>
        )}
      />}
    </View>
  );
}