import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import * as Location from "expo-location";

import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { CategoryPicker } from "@/components/CategoryPicker";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";

import {
  Button,
  styles as s,
} from "@/components/JobsUi";

import { useSupabaseAuth } from "@/hooks/useBusiness";

import {
  useJobCategories,
  useJobMutation,
  useOwnerJob,
} from "@/hooks/useJobs";

import {
  type Job,
  type JobInput,
} from "@/lib/jobs";

/*
 * IMPORTANT
 *
 * Do NOT use require() here.
 * Do NOT import react-native-maps here.
 *
 * Expo/Metro will automatically choose:
 *
 * JobMap.native.tsx  -> Android/iOS
 * JobMap.web.tsx     -> Web
 */
import JobMap from "./JobMap.web";

const legal = "2026-09-10";

const workTypes = [
  ["full_time", "Full time"],
  ["part_time", "Part time"],
  ["temporary", "Temporary"],
  ["contract", "Contract"],
  ["internship", "Internship"],
  ["freelance", "Freelance"],
] as const;

const workplaceTypes = [
  ["on_site", "On-site"],
  ["remote", "Remote"],
  ["hybrid", "Hybrid"],
] as const;

const DEFAULT_REGION = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 12,
  longitudeDelta: 12,
};

const blank = (): JobInput => ({
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

  work_type: "full_time",

  work_mode: "on_site",

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
  if (!datePattern.test(value)) {
    return false;
  }

  const parsed = new Date(
    `${value}T00:00:00Z`,
  );

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

const getSafeErrorMessage = (
  error: unknown,
): string => {
  if (
    typeof error === "string" &&
    error.trim()
  ) {
    return error.trim();
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    const message =
      (error as {
        message?: unknown;
      }).message;

    if (
      typeof message === "string" &&
      message.trim()
    ) {
      return message.trim();
    }
  }

  return "Unable to save the job. Please try again.";
};

export default function EditJob() {
  const auth = useSupabaseAuth();

  const params =
    useLocalSearchParams<{
      id?: string | string[];
    }>();

  const id = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const router = useRouter();

  const draft = useOwnerJob(id ?? "");

  const categories =
    useJobCategories();

  const mutation =
    useJobMutation();

  const [form, setForm] =
    useState<JobInput>(blank());

  const [terms, setTerms] =
    useState(false);

  const [errors, setErrors] =
    useState<Errors>({});

  const [formError, setFormError] =
    useState("");

  const hydratedId =
    useRef<string | null>(null);

  /*
   * MAP STATE
   */

  const [mapVisible, setMapVisible] =
    useState(false);

  const [mapRegion, setMapRegion] =
    useState(DEFAULT_REGION);

  const [mapMarker, setMapMarker] =
    useState<{
      latitude: number;
      longitude: number;
    } | null>(null);

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [mapLoading, setMapLoading] =
    useState(false);

  /*
   * LOAD EXISTING JOB
   */

  useEffect(() => {
    if (
      !id ||
      !draft.data ||
      draft.data.id !== id ||
      hydratedId.current === id
    ) {
      return;
    }

    const job = draft.data;

    setForm({
      ...blank(),
      ...job,

      contact_person:
        job.employer_name,

      category_id:
        job.category_id ?? "",

      role:
        job.job_role ?? "",

      required_experience:
        job.required_experience_months ==
        null
          ? ""
          : String(
              job.required_experience_months,
            ),

      work_mode:
        job.workplace_type,

      vacancies:
        String(job.vacancies),

      salary_min:
        job.salary_min == null
          ? ""
          : String(job.salary_min),

      salary_max:
        job.salary_max == null
          ? ""
          : String(job.salary_max),

      joining_date:
        job.joining_date ?? "",

      application_deadline:
        job.application_deadline ?? "",
    });

    setTerms(
      Boolean(job.terms_accepted_at),
    );

    hydratedId.current = id;
  }, [draft.data, id]);

  /*
   * UPDATE FIELD
   */

  const setValue = (
    key: keyof JobInput,
    value: unknown,
  ) => {
    setForm(
      (current: JobInput) => ({
        ...current,
        [key]: value,
      }),
    );

    setErrors(current => {
      if (!current[String(key)]) {
        return current;
      }

      const next = {
        ...current,
      };

      delete next[String(key)];

      return next;
    });

    setFormError("");
  };

  /*
   * GENERIC FIELD
   */

  const field = (
    key: keyof JobInput,
    label: string,
    multi = false,
  ) => (
    <View>
      <Text style={s.label}>
        {label}
      </Text>

      <TextInput
        style={[
          s.input,

          multi && {
            height: 100,
            textAlignVertical: "top",
          },

          errors[String(key)] && {
            borderColor: "#ef4444",
          },
        ]}
        multiline={multi}
        value={String(
          form[key] ?? "",
        )}
        onChangeText={value =>
          setValue(
            key,
            value,
          )
        }
        placeholder={label}
        placeholderTextColor={
          s.subtitle.color
        }
      />

      {errors[String(key)] ? (
        <Text
          style={{
            color: "#ef4444",
            fontSize: 12,
          }}
        >
          {errors[String(key)]}
        </Text>
      ) : null}
    </View>
  );

  /*
   * REVERSE GEOCODE
   */

  const applyCoordinates = async (
    latitude: number,
    longitude: number,
  ) => {
    try {
      setMapLoading(true);

      setMapMarker({
        latitude,
        longitude,
      });

      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      const results =
        await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

      const address =
        results?.[0];

      if (!address) {
        setFormError(
          "Location selected, but address details are unavailable. You can enter City and Area manually.",
        );

        return;
      }

      const parts = [
        address.name,
        address.street,
        address.streetNumber,
        address.district,
        address.subregion,
        address.city,
        address.region,
        address.country,
      ]
        .filter(Boolean)
        .map(value =>
          String(value).trim(),
        )
        .filter(Boolean);

      const uniqueParts =
        Array.from(
          new Set(parts),
        );

      const fullAddress =
        uniqueParts.join(", ");

      const city =
        address.city ||
        address.subregion ||
        address.district ||
        "";

      const area =
        address.district ||
        address.subregion ||
        address.street ||
        "";

      setForm(
        current => ({
          ...current,

          location_text:
            fullAddress ||
            current.location_text,

          city:
            city ||
            current.city,

          area:
            area ||
            current.area,
        }),
      );

      setErrors(current => ({
        ...current,

        location_text: "",
        city: "",
        area: "",
      }));

      setFormError("");
    } catch (error) {
      console.error(
        "Reverse geocoding failed:",
        error,
      );

      setFormError(
        "Location selected, but address details could not be loaded. You can enter the address manually.",
      );
    } finally {
      setMapLoading(false);
    }
  };

  /*
   * USE CURRENT LOCATION
   */

  const useCurrentLocation =
    async () => {
      if (locationLoading) {
        return;
      }

      try {
        setLocationLoading(true);

        setFormError("");

        const servicesEnabled =
          await Location.hasServicesEnabledAsync();

        if (!servicesEnabled) {
          Alert.alert(
            "Location is unavailable",
            "Please turn on Location/GPS on your phone and try again.",
          );

          return;
        }

        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (
          permission.status !==
          Location.PermissionStatus.GRANTED
        ) {
          Alert.alert(
            "Location permission required",
            "Please allow GAMEZONE ARENA to access your device location while using the app.",
          );

          return;
        }

        const position =
          await Location.getCurrentPositionAsync(
            {
              accuracy:
                Location.Accuracy.Balanced,
            },
          );

        const latitude =
          position.coords.latitude;

        const longitude =
          position.coords.longitude;

        setMapMarker({
          latitude,
          longitude,
        });

        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });

        await applyCoordinates(
          latitude,
          longitude,
        );

        setMapVisible(true);
      } catch (error) {
        console.error(
          "Current location failed:",
          error,
        );

        Alert.alert(
          "Location unavailable",
          "The device location could not be obtained. Please check GPS/location permission and try again.",
        );
      } finally {
        setLocationLoading(false);
      }
    };

  /*
   * OPEN MAP
   */

  const openMap = () => {
    setFormError("");

    if (mapMarker) {
      setMapRegion({
        latitude:
          mapMarker.latitude,

        longitude:
          mapMarker.longitude,

        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }

    setMapVisible(true);
  };

  /*
   * MAP PRESS
   */

  const onMapPress = async (
    latitude: number,
    longitude: number,
  ) => {
    setMapMarker({
      latitude,
      longitude,
    });

    setMapRegion({
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });

    await applyCoordinates(
      latitude,
      longitude,
    );
  };

  /*
   * CONFIRM MAP LOCATION
   */

  const confirmMapLocation =
    () => {
      if (!mapMarker) {
        Alert.alert(
          "Choose a location",
          "Please tap on the map first.",
        );

        return;
      }

      setMapVisible(false);

      setFormError("");

      Alert.alert(
        "Location selected",
        "The selected map location has been added to the job post.",
      );
    };

  /*
   * VALIDATE
   */

  const validate = (
    forPublish: boolean,
  ) => {
    const next: Errors = {};

    const draftRequired:
      Array<[string, string]> = [
      [
        "title",
        "Job title is required.",
      ],

      [
        "company_name",
        "Company / business name is required.",
      ],

      [
        "contact_person",
        "Contact person is required.",
      ],

      [
        "description",
        "Job description is required.",
      ],

      [
        "city",
        "City is required.",
      ],
    ];

    const publishRequired:
      Array<[string, string]> = [
      [
        "category_id",
        "Please choose a job category.",
      ],

      [
        "role",
        "Job role is required.",
      ],

      [
        "required_skills",
        "Required skills are required.",
      ],

      [
        "required_experience",
        "Required experience is required.",
      ],

      [
        "education_requirement",
        "Education requirement is required.",
      ],

      [
        "vacancies",
        "Vacancies are required.",
      ],

      [
        "salary_min",
        "Minimum salary is required.",
      ],

      [
        "salary_max",
        "Maximum salary is required.",
      ],

      [
        "area",
        "Area is required.",
      ],

      [
        "location_text",
        "Work location is required.",
      ],

      [
        "working_hours",
        "Working hours are required.",
      ],

      [
        "benefits",
        "Benefits are required.",
      ],

      [
        "requirements",
        "Requirements are required.",
      ],

      [
        "application_deadline",
        "Application deadline is required.",
      ],
    ];

    const required =
      forPublish
        ? [
            ...draftRequired,
            ...publishRequired,
          ]
        : draftRequired;

    required.forEach(
      ([key, message]) => {
        if (
          !String(
            form[key] ?? "",
          ).trim()
        ) {
          next[key] =
            message;
        }
      },
    );

    if (
      String(
        form.description ?? "",
      ).trim() &&
      String(form.description)
        .trim().length < 20
    ) {
      next.description =
        "Job description must be at least 20 characters.";
    }

    const vacancies =
      Number(form.vacancies);

    if (
      !Number.isInteger(
        vacancies,
      ) ||
      vacancies < 1 ||
      vacancies > 10000
    ) {
      next.vacancies =
        "Vacancies must be a whole number between 1 and 10,000.";
    }

    const parseMoney = (
      key:
        | "salary_min"
        | "salary_max",

      label: string,
    ) => {
      const raw =
        String(
          form[key] ?? "",
        ).trim();

      if (!raw) {
        return null;
      }

      const value =
        Number(raw);

      if (
        !Number.isFinite(
          value,
        ) ||
        value < 0
      ) {
        next[key] =
          `${label} must be a valid non-negative number.`;

        return null;
      }

      return value;
    };

    const salaryMin =
      parseMoney(
        "salary_min",
        "Minimum salary",
      );

    const salaryMax =
      parseMoney(
        "salary_max",
        "Maximum salary",
      );

    if (
      salaryMin != null &&
      salaryMax != null &&
      salaryMin > salaryMax
    ) {
      next.salary_max =
        "Maximum salary must be equal to or greater than minimum salary.";
    }

    const experienceRaw =
      String(
        form.required_experience ??
          "",
      ).trim();

    const experience =
      experienceRaw
        ? Number(
            experienceRaw,
          )
        : null;

    if (
      experience != null &&
      (!Number.isInteger(
        experience,
      ) ||
        experience < 0)
    ) {
      next.required_experience =
        "Experience must be a non-negative whole number of months.";
    }

    const joiningDate =
      String(
        form.joining_date ??
          "",
      ).trim();

    const deadline =
      String(
        form.application_deadline ??
          "",
      ).trim();

    if (
      joiningDate &&
      !validDate(
        joiningDate,
      )
    ) {
      next.joining_date =
        "Use a valid date in YYYY-MM-DD format.";
    }

    if (
      deadline &&
      !validDate(
        deadline,
      )
    ) {
      next.application_deadline =
        "Use a valid date in YYYY-MM-DD format.";
    }

    if (
      joiningDate &&
      deadline &&
      validDate(
        joiningDate,
      ) &&
      validDate(
        deadline,
      ) &&
      deadline > joiningDate
    ) {
      next.application_deadline =
        "Application deadline cannot be after the joining date.";
    }

    if (
      forPublish &&
      !terms &&
      !form.terms_accepted_at
    ) {
      next.terms =
        "Accept the posting rules and privacy notice.";
    }

    setErrors(next);

    if (
      Object.keys(next).length
    ) {
      setFormError(
        "Please complete the required fields.",
      );

      return null;
    }

    return {
      vacancies,
      salaryMin,
      salaryMax,
      experience,
      joiningDate,
      deadline,
    };
  };

  /*
   * SAVE / PREVIEW
   */

  const save = (
    preview = false,
  ) => {
    if (
      mutation.isPending
    ) {
      return;
    }

    try {
      const parsed =
        validate(preview);

      if (!parsed) {
        return;
      }

      const requiredSkills =
        Array.isArray(
          form.required_skills,
        )
          ? form.required_skills
          : String(
              form.required_skills ??
                "",
            )
              .split(",")
              .map(value =>
                value.trim(),
              )
              .filter(Boolean);

      const payload = {
        ...form,

        category:
          undefined,

        vacancies:
          parsed.vacancies,

        salary_min:
          parsed.salaryMin,

        salary_max:
          parsed.salaryMax,

        required_experience_months:
          parsed.experience,

        required_skills:
          requiredSkills,

        joining_date:
          parsed.joiningDate ||
          null,

        application_deadline:
          parsed.deadline ||
          null,

        terms_accepted_at:
          terms
            ? new Date().toISOString()
            : form.terms_accepted_at,
      };

      mutation.mutate(
        {
          type: "save",
          id,
          value: payload,
        },
        {
          onSuccess: result => {
            try {
              const job =
                result as Job;

              if (!job?.id) {
                throw new Error(
                  "Saved job did not return a valid job ID.",
                );
              }

              if (preview) {
                router.replace(
                  `/business/jobs/preview?id=${job.id}` as never,
                );

                return;
              }

              router.replace(
                "/business/jobs/mine" as never,
              );

              setTimeout(() => {
                Alert.alert(
                  "Saved successfully",
                  "Your job draft is now visible in My Job Posts.",
                );
              }, 250);
            } catch (error) {
              console.error(
                "Unable to navigate after job save:",
                error,
              );

              const message =
                getSafeErrorMessage(
                  error,
                );

              setFormError(
                "Unable to open the next screen. Please try again.",
              );

              Alert.alert(
                "Unable to continue",
                message,
              );
            }
          },

          onError: error => {
            console.error(
              "Unable to save job:",
              error,
            );

            const message =
              getSafeErrorMessage(
                error,
              );

            const lowerMessage =
              message.toLowerCase();

            const contactProblem =
              lowerMessage.includes(
                "contact",
              ) &&
              (
                lowerMessage.includes(
                  "save",
                ) ||
                lowerMessage.includes(
                  "contact details",
                )
              );

            if (
              contactProblem
            ) {
              setFormError(
                "Your job could not save its contact details. Please check the contact information and save again.",
              );

              Alert.alert(
                "Contact details need retry",
                "Please check the contact information and save again.",
              );

              return;
            }

            const fallbackMessage =
              preview
                ? "Unable to open job preview. Please try again."
                : "Unable to save. Please try again.";

            setFormError(
              fallbackMessage,
            );

            Alert.alert(
              preview
                ? "Unable to open job preview"
                : "Unable to save",

              message ||
                "Please try again.",
            );
          },
        },
      );
    } catch (error) {
      console.error(
        "Unexpected Post a Job error:",
        error,
      );

      const message =
        getSafeErrorMessage(
          error,
        );

      setFormError(
        "Unable to save this job. Please try again.",
      );

      Alert.alert(
        "Unable to save",
        message,
      );
    }
  };

  /*
   * EXISTING JOB LOADING
   */

  if (
    id &&
    draft.isLoading
  ) {
    return (
      <ActivityIndicator />
    );
  }

  /*
   * EXISTING JOB ERROR
   */

  if (
    id &&
    draft.error
  ) {
    return (
      <View style={s.content}>
        <Text style={s.empty}>
          {getSafeErrorMessage(
            draft.error,
          )}
        </Text>

        <Button
          kind
          label="Retry loading job"
          onPress={() =>
            draft.refetch()
          }
        />
      </View>
    );
  }

  return (
    <>
      <KeyboardAwareScrollViewCompat
        style={s.root}
        contentContainerStyle={
          s.content
        }
      >
        <Text style={s.title}>
          {id
            ? "Edit job"
            : "Post a job"}
        </Text>

        <Text style={s.subtitle}>
          Never request OTPs,
          passwords, PINs, or
          financial information.
          New posts are reviewed
          before public discovery.
        </Text>

        {formError ? (
          <Text
            style={{
              color: "#ef4444",
              fontWeight: "700",
            }}
          >
            {formError}
          </Text>
        ) : null}

        <Text style={s.subtitle}>
          Fields marked * are
          required. Save draft keeps
          this post private; Preview
          checks all required posting
          fields.
        </Text>

        {field(
          "title",
          "Job title *",
        )}

        {field(
          "company_name",
          "Company / business name *",
        )}

        {field(
          "contact_person",
          "Contact person *",
        )}

        <View>
          <CategoryPicker
            label="Job category *"
            categories={
              categories.data ?? []
            }
            selectedId={
              form.category_id
            }
            onChoose={category =>
              setValue(
                "category_id",
                category.id,
              )
            }
            loading={
              categories.isLoading
            }
            error={
              categories.error
            }
            onRetry={() =>
              categories.refetch()
            }
          />

          {!auth.isLoaded ? (
            <ActivityIndicator />
          ) : null}

          {auth.isLoaded &&
          !auth.isSignedIn ? (
            <Text
              style={{
                color: "#ef4444",
                fontSize: 12,
              }}
            >
              Please sign in to load
              categories and post a
              job.
            </Text>
          ) : null}

          {errors.category_id ? (
            <Text
              style={{
                color: "#ef4444",
                fontSize: 12,
              }}
            >
              {errors.category_id}
            </Text>
          ) : null}
        </View>

        {field(
          "role",
          "Job role *",
        )}

        <View>
          <Text style={s.label}>
            Job type *
          </Text>

          <View style={s.row}>
            {workTypes.map(
              ([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() =>
                    setValue(
                      "work_type",
                      value,
                    )
                  }
                  style={[
                    s.card,

                    form.work_type ===
                      value && {
                        borderColor:
                          s.buttonText
                            .color,
                      },
                  ]}
                >
                  <Text style={s.meta}>
                    {form.work_type ===
                    value
                      ? "✓ "
                      : ""}
                    {label}
                  </Text>
                </Pressable>
              ),
            )}
          </View>
        </View>

        <View>
          <Text style={s.label}>
            Workplace *
          </Text>

          <View style={s.row}>
            {workplaceTypes.map(
              ([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() =>
                    setValue(
                      "work_mode",
                      value,
                    )
                  }
                  style={[
                    s.card,

                    form.work_mode ===
                      value && {
                        borderColor:
                          s.buttonText
                            .color,
                      },
                  ]}
                >
                  <Text style={s.meta}>
                    {form.work_mode ===
                    value
                      ? "✓ "
                      : ""}
                    {label}
                  </Text>
                </Pressable>
              ),
            )}
          </View>
        </View>

        {field(
          "description",
          "Job description *",
          true,
        )}

        {field(
          "required_skills",
          "Required skills (comma separated) *",
        )}

        {field(
          "required_experience",
          "Required experience (months) *",
        )}

        {field(
          "education_requirement",
          "Education requirement *",
        )}

        {field(
          "vacancies",
          "Vacancies *",
        )}

        {field(
          "salary_min",
          "Minimum salary *",
        )}

        {field(
          "salary_max",
          "Maximum salary *",
        )}

        <View>
          <Text style={s.label}>
            Location
          </Text>

          <LocationAutocomplete
            value={
              form.location_text
            }
            error={
              errors.location_text
            }
            onChangeText={value =>
              setValue(
                "location_text",
                value,
              )
            }
            onSelect={location => {
              setForm(
                current => ({
                  ...current,

                  location_text:
                    location.address,

                  city:
                    location.city ||
                    current.city,

                  area:
                    location.area ||
                    current.area,
                }),
              );

              setErrors(
                current => ({
                  ...current,

                  location_text:
                    "",

                  city: "",

                  area: "",
                }),
              );

              setFormError("");
            }}
          />

          <View
            style={
              styles.locationButtons
            }
          >
            <Pressable
              onPress={
                useCurrentLocation
              }
              disabled={
                locationLoading
              }
              style={[
                styles.locationButton,

                locationLoading &&
                  styles.disabledButton,
              ]}
            >
              {locationLoading ? (
                <ActivityIndicator
                  color="#ffffff"
                  size="small"
                />
              ) : (
                <Text
                  style={
                    styles.locationButtonText
                  }
                >
                  ◎ USE CURRENT LOCATION
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={openMap}
              style={
                styles.mapButton
              }
            >
              <Text
                style={
                  styles.mapButtonText
                }
              >
                🗺️ CHOOSE ON MAP
              </Text>
            </Pressable>
          </View>

          <Text
            style={
              styles.locationHint
            }
          >
            Search a place above, use
            your device location, or tap
            any point on the map to choose
            the work location.
          </Text>
        </View>

        {field(
          "city",
          "City *",
        )}

        {field(
          "area",
          "Area *",
        )}

        {field(
          "working_hours",
          "Working hours *",
        )}

        {field(
          "benefits",
          "Benefits *",
        )}

        {field(
          "requirements",
          "Requirements *",
          true,
        )}

        {field(
          "joining_date",
          "Joining date (YYYY-MM-DD)",
        )}

        {field(
          "application_deadline",
          "Application deadline (YYYY-MM-DD) *",
        )}

        {field(
          "contact_phone",
          "Phone (optional)",
        )}

        {field(
          "whatsapp",
          "WhatsApp (optional)",
        )}

        {field(
          "email",
          "Email (optional)",
        )}

        <View>
          <Pressable
            onPress={() => {
              setTerms(
                value => !value,
              );

              setErrors(
                current => ({
                  ...current,
                  terms: "",
                }),
              );

              setFormError("");
            }}
            style={s.card}
          >
            <Text style={s.meta}>
              {terms
                ? "✓"
                : "□"}{" "}
              I accept the job posting
              rules and privacy notice.
            </Text>
          </Pressable>

          {errors.terms ? (
            <Text
              style={{
                color: "#ef4444",
                fontSize: 12,
              }}
            >
              {errors.terms}
            </Text>
          ) : null}
        </View>

        <Button
          label={
            mutation.isPending
              ? "Saving…"
              : "Save draft"
          }
          onPress={() =>
            save(false)
          }
        />

        <Button
          label={
            mutation.isPending
              ? "Opening preview…"
              : "Preview & publish"
          }
          kind
          onPress={() =>
            save(true)
          }
        />
      </KeyboardAwareScrollViewCompat>

      <JobMap
        visible={mapVisible}
        region={mapRegion}
        marker={mapMarker}
        locationLoading={
          locationLoading
        }
        mapLoading={
          mapLoading
        }
        selectedLocation={
          form.location_text
        }
        onClose={() =>
          setMapVisible(false)
        }
        onMapPress={
          onMapPress
        }
        onCurrentLocation={
          useCurrentLocation
        }
        onConfirm={
          confirmMapLocation
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  locationButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    marginBottom: 6,
  },

  locationButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  disabledButton: {
    opacity: 0.6,
  },

  locationButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 12,
    textAlign: "center",
  },

  mapButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  mapButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 12,
    textAlign: "center",
  },

  locationHint: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 8,
  },
});