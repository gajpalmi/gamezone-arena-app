import React from "react";
import { Alert, FlatList, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, styles as s } from "@/components/JobsUi";
import { useSupabaseAuth } from "@/hooks/useBusiness";
import { useJobMutation, useMyJobs } from "@/hooks/useJobs";

export default function Mine() {
  useSupabaseAuth();
  const router = useRouter();
  const { data, error } = useMyJobs();
  const mutation = useJobMutation();

  return (
    <View style={[s.root, { padding: 20 }]}>
      <Text style={s.title}>My Job Posts</Text>
      <Button label="Post a job" kind onPress={() => router.push("/business/jobs/edit" as never)} />
      <FlatList
        data={data ?? []}
        keyExtractor={item => item.id}
        contentContainerStyle={{ gap: 10, marginTop: 12 }}
        ListEmptyComponent={<Text style={s.empty}>{error ? (error as Error).message : "No job posts yet."}</Text>}
        renderItem={({ item }) => (
          <View style={{ gap: 6 }}>
            <Card job={item} onPress={() => router.push(`/business/jobs/${item.id}` as never)} />
            <Text style={s.meta}>Status: {item.status}</Text>
            <View style={s.row}>
              <Button label="Edit" onPress={() => router.push(`/business/jobs/edit?id=${item.id}` as never)} />
              <Button label="Applications" onPress={() => router.push(`/business/jobs/applications?jobId=${item.id}` as never)} />
              {item.status === "draft" && (
                <Button label="Submit" onPress={() => mutation.mutate({ type: "submit", id: item.id })} />
              )}
              {["active", "paused"].includes(item.status) && (
                <Button
                  label={item.status === "active" ? "Pause" : "Resume"}
                  onPress={() => mutation.mutate({ type: "status", id: item.id, value: item.status === "active" ? "paused" : "active" })}
                />
              )}
              <Button label="Close" onPress={() => mutation.mutate({ type: "status", id: item.id, value: "closed" })} />
              <Button
                label="Delete"
                onPress={() => Alert.alert("Delete job", "This cannot be undone.", [
                  { text: "Cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => mutation.mutate({ type: "delete", id: item.id }),
                  },
                ])}
              />
            </View>
          </View>
        )}
      />
    </View>
  );
}