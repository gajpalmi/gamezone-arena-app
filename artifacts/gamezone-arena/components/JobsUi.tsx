import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import colors from "@/constants/colors";
import type { Job } from "@/lib/jobs";

export const Button = ({ label, onPress, kind = false }: { label: string; onPress: () => void; kind?: boolean }) => (
  <Pressable style={[styles.button, kind && styles.primary]} onPress={onPress}>
    <Text style={[styles.buttonText, kind && styles.primaryText]}>{label}</Text>
  </Pressable>
);

export const Card = ({ job, onPress }: { job: Job; onPress: () => void }) => (
  <Pressable style={styles.card} onPress={onPress}>
    <View style={styles.top}>
      <Text style={styles.name}>{job.title}</Text>
      {job.verification_status === "verified" && <Text style={styles.verified}>✓ VERIFIED</Text>}
    </View>
    <Text style={styles.company}>{job.company_name}</Text>
    <Text style={styles.meta}>
      {job.category ?? "General"} · {job.work_type.replace("_", " ")} · {job.workplace_type.replace("_", " ")}
    </Text>
    <Text style={styles.meta}>📍 {[job.area, job.city].filter(Boolean).join(", ")} · {job.vacancies} opening{job.vacancies === 1 ? "" : "s"}</Text>
    <Text style={styles.salary}>
      {job.salary_min == null ? "Salary: negotiable" : `₹${job.salary_min}${job.salary_max ? ` – ₹${job.salary_max}` : ""} · ${job.salary_type}`}
    </Text>
    {job.application_deadline && <Text style={styles.meta}>Apply by {job.application_deadline}</Text>}
  </Pressable>
);

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light.background },
  content: { padding: 20, gap: 12, paddingBottom: 50 },
  title: { color: colors.light.foreground, fontSize: 25, fontWeight: "900" },
  subtitle: { color: colors.light.mutedForeground, lineHeight: 20 },
  card: { backgroundColor: colors.light.card, borderColor: colors.light.border, borderWidth: 1, borderRadius: 14, padding: 15, gap: 5 },
  top: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  name: { color: colors.light.foreground, fontWeight: "900", fontSize: 17, flex: 1 },
  company: { color: colors.light.primary, fontWeight: "700" },
  meta: { color: colors.light.mutedForeground, fontSize: 12 },
  salary: { color: colors.light.foreground, fontWeight: "700", fontSize: 13 },
  verified: { color: colors.light.primary, fontSize: 10, fontWeight: "900" },
  button: { borderColor: colors.light.border, borderWidth: 1, borderRadius: 11, padding: 12, alignItems: "center" },
  primary: { backgroundColor: colors.light.primary, borderColor: colors.light.primary },
  buttonText: { color: colors.light.primary, fontWeight: "800", fontSize: 12 },
  primaryText: { color: colors.light.primaryForeground },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: { backgroundColor: colors.light.card, color: colors.light.foreground, borderColor: colors.light.border, borderWidth: 1, borderRadius: 11, padding: 12 },
  label: { color: colors.light.mutedForeground, fontWeight: "800", fontSize: 11, marginTop: 4 },
  empty: { color: colors.light.mutedForeground, textAlign: "center", marginTop: 50 },
  back: { color: colors.light.primary, fontWeight: "800" },
});