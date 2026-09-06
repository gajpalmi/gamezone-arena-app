import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { CategoryPicker } from "@/components/CategoryPicker";
import { Button, styles as s } from "@/components/JobsUi";
import { useSupabaseAuth } from "@/hooks/useBusiness";
import { useJob, useJobCategories, useJobMutation } from "@/hooks/useJobs";
import type { Job, JobInput } from "@/lib/jobs";

const legal = "2026-09-10";
const workTypes = [["full_time", "Full time"], ["part_time", "Part time"], ["temporary", "Temporary"], ["contract", "Contract"], ["internship", "Internship"], ["freelance", "Freelance"]] as const;
const workplaceTypes = [["on_site", "On-site"], ["remote", "Remote"], ["hybrid", "Hybrid"]] as const;
const blank = () => ({
  business_id: null,
  title: "",
  company_name: "",
  contact_person: "",
  category_id: "",
  role: "",
  description: "",
  responsibilities: "",
  required_skills: [],
  required_experience: "",
  education_requirement: "",
  vacancies: "1",
  salary_min: "",
  salary_max: "",
  salary_type: "monthly",
  work_type: "full_time" as const,
  work_mode: "on_site" as const,
  city: "",
  area: "",
  location_text: "",
  working_hours: "",
  weekly_off: "",
  benefits: "",
  requirements: "",
  joining_date: "",
  application_deadline: "",
  contact_preference: "in_app",
  contact_phone: "",
  whatsapp: "",
  email: "",
  website: "",
  contact_public_consent_at: null,
  terms_version: legal,
  terms_accepted_at: "",
});

type Errors = Record<string, string>;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (value: string) => {
  if (!datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export default function EditJob() {
  const auth = useSupabaseAuth();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const draft = useJob(id ?? "");
  const categories = useJobCategories();
  const mutation = useJobMutation();
  const [form, setForm] = useState<JobInput>(blank());
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!draft.data) return;
    const job = draft.data;
    setForm({
      ...blank(),
      ...job,
      contact_person: job.employer_name,
      category_id: job.category_id ?? "",
      role: job.job_role ?? "",
      required_experience: job.required_experience_months == null ? "" : String(job.required_experience_months),
      work_mode: job.workplace_type,
      vacancies: String(job.vacancies),
      salary_min: job.salary_min == null ? "" : String(job.salary_min),
      salary_max: job.salary_max == null ? "" : String(job.salary_max),
      joining_date: job.joining_date ?? "",
      application_deadline: job.application_deadline ?? "",
    });
    setTerms(Boolean(job.terms_accepted_at));
  }, [draft.data]);

  const setValue = (key: keyof JobInput, value: unknown) => {
    setForm((current: JobInput) => ({ ...current, [key]: value }));
    setErrors(current => {
      if (!current[String(key)]) return current;
      const next = { ...current };
      delete next[String(key)];
      return next;
    });
    setFormError("");
  };

  const field = (key: keyof JobInput, label: string, multi = false) => (
    <View>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, multi && { height: 100, textAlignVertical: "top" }, errors[String(key)] && { borderColor: "#ef4444" }]}
        multiline={multi}
        value={String(form[key] ?? "")}
        onChangeText={value => setValue(key, value)}
        placeholder={label}
        placeholderTextColor={s.subtitle.color}
      />
      {errors[String(key)] ? <Text style={{ color: "#ef4444", fontSize: 12 }}>{errors[String(key)]}</Text> : null}
    </View>
  );

  const validate = (forPublish: boolean) => {
    const next: Errors = {};
    const draftRequired: Array<[string, string]> = [
      ["title", "Job title is required."],
      ["company_name", "Company / business name is required."],
      ["contact_person", "Contact person is required."],
      ["description", "Job description is required."],
      ["city", "City is required."],
    ];
    const publishRequired: Array<[string, string]> = [
      ["category_id", "Please choose a job category."],
      ["role", "Job role is required."],
      ["required_skills", "Required skills are required."],
      ["required_experience", "Required experience is required."],
      ["education_requirement", "Education requirement is required."],
      ["vacancies", "Vacancies are required."],
      ["salary_min", "Minimum salary is required."],
      ["salary_max", "Maximum salary is required."],
      ["area", "Area is required."],
      ["location_text", "Work location is required."],
      ["working_hours", "Working hours are required."],
      ["benefits", "Benefits are required."],
      ["requirements", "Requirements are required."],
      ["application_deadline", "Application deadline is required."],
    ];
    const required = forPublish ? [...draftRequired, ...publishRequired] : draftRequired;
    required.forEach(([key, message]) => {
      if (!String(form[key] ?? "").trim()) next[key] = message;
    });
    if (String(form.description ?? "").trim() && String(form.description).trim().length < 20) {
      next.description = "Job description must be at least 20 characters.";
    }

    const vacancies = Number(form.vacancies);
    if (!Number.isInteger(vacancies) || vacancies < 1 || vacancies > 10000) {
      next.vacancies = "Vacancies must be a whole number between 1 and 10,000.";
    }

    const parseMoney = (key: "salary_min" | "salary_max", label: string) => {
      const raw = String(form[key] ?? "").trim();
      if (!raw) return null;
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0) {
        next[key] = `${label} must be a valid non-negative number.`;
        return null;
      }
      return value;
    };
    const salaryMin = parseMoney("salary_min", "Minimum salary");
    const salaryMax = parseMoney("salary_max", "Maximum salary");
    if (salaryMin != null && salaryMax != null && salaryMin > salaryMax) {
      next.salary_max = "Maximum salary must be equal to or greater than minimum salary.";
    }

    const experienceRaw = String(form.required_experience ?? "").trim();
    const experience = experienceRaw ? Number(experienceRaw) : null;
    if (experience != null && (!Number.isInteger(experience) || experience < 0)) {
      next.required_experience = "Experience must be a non-negative whole number of months.";
    }

    const joiningDate = String(form.joining_date ?? "").trim();
    const deadline = String(form.application_deadline ?? "").trim();
    if (joiningDate && !validDate(joiningDate)) next.joining_date = "Use a valid date in YYYY-MM-DD format.";
    if (deadline && !validDate(deadline)) next.application_deadline = "Use a valid date in YYYY-MM-DD format.";
    if (joiningDate && deadline && validDate(joiningDate) && validDate(deadline) && deadline > joiningDate) {
      next.application_deadline = "Application deadline cannot be after the joining date.";
    }
    if (forPublish && !terms && !form.terms_accepted_at) next.terms = "Accept the posting rules and privacy notice.";

    setErrors(next);
    if (Object.keys(next).length) {
      setFormError("Please complete the required fields.");
      return null;
    }
    return { vacancies, salaryMin, salaryMax, experience, joiningDate, deadline };
  };

  const save = (preview = false) => {
    if (mutation.isPending) return;
    try {
      const parsed = validate(preview);
      if (!parsed) return;
      const payload = {
        ...form,
        category: undefined,
        vacancies: parsed.vacancies,
        salary_min: parsed.salaryMin,
        salary_max: parsed.salaryMax,
        required_experience_months: parsed.experience,
        required_skills: Array.isArray(form.required_skills)
          ? form.required_skills
          : String(form.required_skills).split(",").map(value => value.trim()).filter(Boolean),
        joining_date: parsed.joiningDate || null,
        application_deadline: parsed.deadline || null,
        terms_accepted_at: terms ? new Date().toISOString() : form.terms_accepted_at,
      };
      mutation.mutate(
        { type: "save", id, value: payload },
        {
          onSuccess: result => {
            try {
              const job = result as Job;
              if (!preview) Alert.alert("Saved successfully", "Your private job draft was saved.");
              router.push((preview ? `/business/jobs/preview?id=${job.id}` : `/business/jobs/${job.id}`) as never);
            } catch (error) {
              console.error("Unable to navigate to job preview", error);
              setFormError("Unable to open job preview. Please try again.");
              Alert.alert("Unable to open job preview", "Please try again.");
            }
          },
          onError: error => {
            console.error("Unable to save job draft", error);
            setFormError(preview ? "Unable to open job preview. Please try again." : "Unable to save. Please try again.");
            Alert.alert(preview ? "Unable to open job preview" : "Unable to save", preview ? "Please try again." : "Please try again.");
          },
        },
      );
    } catch (error) {
      console.error("Unexpected Post a Job error", error);
      setFormError("Unable to open job preview. Please try again.");
      Alert.alert("Unable to open job preview", "Please try again.");
    }
  };

  if (id && draft.isLoading) return <ActivityIndicator />;
  if (id && draft.error) return <Text style={s.empty}>{(draft.error as Error).message}</Text>;

  return (
    <KeyboardAwareScrollViewCompat style={s.root} contentContainerStyle={s.content}>
      <Text style={s.title}>{id ? "Edit job" : "Post a job"}</Text>
      <Text style={s.subtitle}>Never request OTPs, passwords, PINs, or financial information. New posts are reviewed before public discovery.</Text>
      {formError ? <Text style={{ color: "#ef4444", fontWeight: "700" }}>{formError}</Text> : null}
      <Text style={s.subtitle}>Fields marked * are required. Save draft keeps this post private; Preview checks all required posting fields.</Text>
      {field("title", "Job title *")}
      {field("company_name", "Company / business name *")}
      {field("contact_person", "Contact person *")}
       <View>
         <CategoryPicker
           label="Job category *"
           categories={categories.data ?? []}
           selectedId={form.category_id}
           onChoose={category => setValue("category_id", category.id)}
           loading={categories.isLoading}
           error={categories.error}
           onRetry={() => categories.refetch()}
         />
        {!auth.isLoaded ? <ActivityIndicator /> : null}
        {auth.isLoaded && !auth.isSignedIn ? <Text style={{ color: "#ef4444", fontSize: 12 }}>Please sign in to load categories and post a job.</Text> : null}
        {errors.category_id ? <Text style={{ color: "#ef4444", fontSize: 12 }}>{errors.category_id}</Text> : null}
      </View>
       {field("role", "Job role *")}
       <View>
         <Text style={s.label}>Job type *</Text>
         <View style={s.row}>{workTypes.map(([value, label]) => <Pressable key={value} onPress={() => setValue("work_type", value)} style={[s.card, form.work_type === value && { borderColor: s.buttonText.color }]}><Text style={s.meta}>{form.work_type === value ? "✓ " : ""}{label}</Text></Pressable>)}</View>
       </View>
       <View>
         <Text style={s.label}>Workplace *</Text>
         <View style={s.row}>{workplaceTypes.map(([value, label]) => <Pressable key={value} onPress={() => setValue("work_mode", value)} style={[s.card, form.work_mode === value && { borderColor: s.buttonText.color }]}><Text style={s.meta}>{form.work_mode === value ? "✓ " : ""}{label}</Text></Pressable>)}</View>
       </View>
       {field("description", "Job description *", true)}
       {field("required_skills", "Required skills (comma separated) *")}
       {field("required_experience", "Required experience (months) *")}
       {field("education_requirement", "Education requirement *")}
       {field("vacancies", "Vacancies *")}
       {field("salary_min", "Minimum salary *")}
       {field("salary_max", "Maximum salary *")}
       {field("city", "City *")}
       {field("area", "Area *")}
       {field("location_text", "Work location / landmark *")}
       {field("working_hours", "Working hours *")}
       {field("benefits", "Benefits *")}
       {field("requirements", "Requirements *", true)}
      {field("joining_date", "Joining date (YYYY-MM-DD)")}
       {field("application_deadline", "Application deadline (YYYY-MM-DD) *")}
      {field("contact_phone", "Phone (optional)")}
      {field("whatsapp", "WhatsApp (optional)")}
      {field("email", "Email (optional)")}
      <View>
        <Pressable onPress={() => { setTerms(value => !value); setErrors(current => ({ ...current, terms: "" })); setFormError(""); }} style={s.card}>
          <Text style={s.meta}>{terms ? "✓" : "□"} I accept the job posting rules and privacy notice.</Text>
        </Pressable>
        {errors.terms ? <Text style={{ color: "#ef4444", fontSize: 12 }}>{errors.terms}</Text> : null}
      </View>
      <Button label={mutation.isPending ? "Saving…" : "Save draft"} onPress={() => save()} />
      <Button label={mutation.isPending ? "Opening preview…" : "Preview & publish"} kind onPress={() => save(true)} />
    </KeyboardAwareScrollViewCompat>
  );
}