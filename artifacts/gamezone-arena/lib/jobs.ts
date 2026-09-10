import { listCategories } from "@/lib/business";

// =========================================================
// JOB CATEGORIES
// =========================================================
// IMPORTANT:
// Keep this function separate from saveJob().
// useJobCategories() calls this function directly.
// =========================================================

export async function jobCategories() {
  try {
    const categories = await listCategories();

    const result = (categories ?? [])
      .map((category: any) => ({
        id: String(category?.id ?? "").trim(),

        name: String(
          category?.name ??
            category?.title ??
            category?.label ??
            ""
        ).trim(),

        slug:
          category?.slug !== undefined &&
          category?.slug !== null &&
          String(category.slug).trim()
            ? String(category.slug).trim()
            : undefined,
      }))
      .filter(
        (category: { id: string; name: string }) =>
          Boolean(category.id) &&
          Boolean(category.name)
      );

    console.log(
      "[GAMEZONE ARENA] JOB CATEGORIES LOADED:",
      result.length
    );

    return result;
  } catch (error) {
    console.error(
      "[GAMEZONE ARENA] JOB CATEGORIES ERROR:",
      error
    );

    throw new Error(
      "Unable to load job categories. Please try again."
    );
  }
}


// =========================================================
// SAVE JOB
// =========================================================

export async function saveJob(
  x: JobInput,
  id?: string
) {
  // -------------------------------------------------------
  // SAFE INPUT
  // -------------------------------------------------------

  const input = x ?? ({} as JobInput);


  // -------------------------------------------------------
  // CONTACT INFORMATION
  // -------------------------------------------------------

  const contact = input.contact ?? {
    phone:
      input.contact_phone?.trim() || null,

    whatsapp:
      input.whatsapp?.trim() || null,

    email:
      input.email?.trim() || null,

    website:
      input.website?.trim() || null,

    phone_public:
      Boolean(input.contact_public),

    whatsapp_public:
      Boolean(input.contact_public),

    email_public:
      Boolean(input.contact_public),
  };


  // -------------------------------------------------------
  // TERMS
  // -------------------------------------------------------

  const acceptedAt =
    input.terms_accepted_at || null;


  // -------------------------------------------------------
  // CATEGORY
  // -------------------------------------------------------

  const categoryValue = String(
    input.category_id ??
      input.category ??
      ""
  ).trim();

  if (!categoryValue) {
    throw new Error(
      "Please select a job category."
    );
  }

  let categoryId: string | null = null;

  try {
    categoryId =
      await resolveCategory(categoryValue);
  } catch (error) {
    console.error(
      "[GAMEZONE ARENA] CATEGORY RESOLVE FAILED:",
      error
    );

    throw new Error(
      "Selected job category could not be found. Please select a valid category and try again."
    );
  }

  if (!categoryId) {
    throw new Error(
      "Selected job category could not be found. Please select a valid category and try again."
    );
  }


  // -------------------------------------------------------
  // BASIC INFORMATION
  // -------------------------------------------------------

  const title = String(
    input.title ?? ""
  ).trim();

  const companyName = String(
    input.company_name ?? ""
  ).trim();

  const employerName = String(
    input.employer_name ??
      input.contact_person ??
      ""
  ).trim();

  const jobRole =
    String(
      input.job_role ??
        input.role ??
        ""
    ).trim() || null;

  const description = String(
    input.description ?? ""
  ).trim();

  const responsibilities =
    String(
      input.responsibilities ?? ""
    ).trim() || null;


  // -------------------------------------------------------
  // REQUIRED BASIC VALIDATION
  // -------------------------------------------------------

  if (!title) {
    throw new Error(
      "Job title is required."
    );
  }

  if (!companyName) {
    throw new Error(
      "Company name is required."
    );
  }

  if (!employerName) {
    throw new Error(
      "Contact person is required."
    );
  }

  if (!description) {
    throw new Error(
      "Job description is required."
    );
  }

  if (description.length < 20) {
    throw new Error(
      "Job description must contain at least 20 characters."
    );
  }


  // -------------------------------------------------------
  // LOCATION
  // -------------------------------------------------------

  const locationText = String(
    input.location_text ??
      input.full_location ??
      input.selected_location ??
      ""
  ).trim() || null;

  const city = String(
    input.city ??
      input.selected_city ??
      ""
  ).trim();

  const area =
    String(
      input.area ??
        input.selected_area ??
        ""
    ).trim() || null;

  const state =
    String(
      input.state ??
        input.selected_state ??
        ""
    ).trim() || null;

  const country =
    String(
      input.country ??
        input.selected_country ??
        ""
    ).trim() || null;


  // -------------------------------------------------------
  // REQUIRED LOCATION VALIDATION
  // -------------------------------------------------------

  if (!city) {
    throw new Error(
      "Please select or enter a city."
    );
  }


  // -------------------------------------------------------
  // GPS VALUES
  // -------------------------------------------------------
  // These are accepted from current-location/map UI when
  // available and validated safely.
  //
  // IMPORTANT:
  // They are NOT added to the database row here because
  // latitude/longitude columns were not confirmed.
  // -------------------------------------------------------

  const latitude =
    input.latitude !== undefined &&
    input.latitude !== null &&
    input.latitude !== ""
      ? Number(input.latitude)
      : null;

  const longitude =
    input.longitude !== undefined &&
    input.longitude !== null &&
    input.longitude !== ""
      ? Number(input.longitude)
      : null;

  const safeLatitude =
    latitude !== null &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90
      ? latitude
      : null;

  const safeLongitude =
    longitude !== null &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
      ? longitude
      : null;


  // -------------------------------------------------------
  // NUMERIC VALUES
  // -------------------------------------------------------

  const requiredExperience =
    nonNegativeInteger(
      input.required_experience_months ??
        input.required_experience,
      "Required experience"
    );

  const vacancies =
    nonNegativeInteger(
      input.vacancies,
      "Vacancies",
      true
    );

  const salaryMin =
    nonNegativeNumber(
      input.salary_min,
      "Minimum salary"
    );

  const salaryMax =
    nonNegativeNumber(
      input.salary_max,
      "Maximum salary"
    );


  // -------------------------------------------------------
  // SALARY VALIDATION
  // -------------------------------------------------------

  if (
    salaryMin !== null &&
    salaryMax !== null &&
    salaryMin > salaryMax
  ) {
    throw new Error(
      "Maximum salary must be equal to or greater than minimum salary."
    );
  }


  // -------------------------------------------------------
  // WORK TYPE
  // -------------------------------------------------------

  const allowedWorkTypes = new Set([
    "full_time",
    "part_time",
    "temporary",
    "contract",
    "internship",
    "freelance",
  ]);

  const workType =
    String(
      input.work_type ??
        "full_time"
    ).trim();

  if (!allowedWorkTypes.has(workType)) {
    throw new Error(
      "Please select a valid job type."
    );
  }


  // -------------------------------------------------------
  // WORKPLACE TYPE
  // -------------------------------------------------------

  const allowedWorkplaceTypes = new Set([
    "on_site",
    "remote",
    "hybrid",
  ]);

  const workplaceType =
    String(
      input.workplace_type ??
        input.work_mode ??
        "on_site"
    ).trim();

  if (!allowedWorkplaceTypes.has(workplaceType)) {
    throw new Error(
      "Please select a valid workplace type."
    );
  }


  // -------------------------------------------------------
  // REQUIRED SKILLS
  // -------------------------------------------------------

  const requiredSkills =
    Array.isArray(input.required_skills)
      ? input.required_skills
          .map((item: unknown) =>
            String(item).trim()
          )
          .filter(Boolean)
      : String(
          input.required_skills ?? ""
        )
          .split(",")
          .map((value) =>
            value.trim()
          )
          .filter(Boolean);

  if (requiredSkills.length === 0) {
    throw new Error(
      "Please enter at least one required skill."
    );
  }


  // -------------------------------------------------------
  // OTHER INFORMATION
  // -------------------------------------------------------

  const educationRequirement =
    String(
      input.education_requirement ?? ""
    ).trim() || null;

  const workingHours =
    String(
      input.working_hours ?? ""
    ).trim() || null;

  const weeklyOff =
    String(
      input.weekly_off ?? ""
    ).trim() || null;

  const benefits =
    String(
      input.benefits ?? ""
    ).trim() || null;

  const requirements =
    String(
      input.requirements ?? ""
    ).trim() || null;

  const joiningDate =
    input.joining_date || null;

  const applicationDeadline =
    input.application_deadline || null;


  // -------------------------------------------------------
  // DATE VALIDATION
  // -------------------------------------------------------

  const isValidDateString = (
    value: unknown
  ) => {
    if (!value) return true;

    const text = String(value).trim();

    if (!text) return true;

    const date = new Date(text);

    return !Number.isNaN(
      date.getTime()
    );
  };

  if (
    !isValidDateString(joiningDate)
  ) {
    throw new Error(
      "Joining date is not valid."
    );
  }

  if (
    !isValidDateString(
      applicationDeadline
    )
  ) {
    throw new Error(
      "Application deadline is not valid."
    );
  }


  // -------------------------------------------------------
  // DEADLINE / JOINING DATE LOGIC
  // -------------------------------------------------------

  if (
    joiningDate &&
    applicationDeadline
  ) {
    const joining =
      new Date(
        String(joiningDate)
      ).getTime();

    const deadline =
      new Date(
        String(applicationDeadline)
      ).getTime();

    if (
      Number.isFinite(joining) &&
      Number.isFinite(deadline) &&
      deadline > joining
    ) {
      throw new Error(
        "Application deadline should not be after the joining date."
      );
    }
  }


  // -------------------------------------------------------
  // FINAL LOCATION
  // -------------------------------------------------------

  const generatedLocation =
    locationText ||
    [
      area,
      city,
      state,
      country,
    ]
      .filter(Boolean)
      .join(", ") ||
    null;


  // -------------------------------------------------------
  // DATABASE ROW
  // -------------------------------------------------------
  // IMPORTANT:
  // Keep this limited to the existing job fields.
  // Do not add latitude/longitude/state/country columns
  // unless those columns actually exist in Supabase.
  // -------------------------------------------------------

  const row = {
    business_id:
      input.business_id ?? null,

    category_id:
      categoryId,

    title,

    company_name:
      companyName,

    employer_name:
      employerName,

    job_role:
      jobRole,

    description,

    responsibilities,

    required_skills:
      requiredSkills,

    required_experience_months:
      requiredExperience,

    education_requirement:
      educationRequirement,

    vacancies,

    salary_min:
      salaryMin,

    salary_max:
      salaryMax,

    salary_type:
      input.salary_type ||
      "monthly",

    work_type:
      workType,

    workplace_type:
      workplaceType,

    location_text:
      generatedLocation,

    city,

    area,

    working_hours:
      workingHours,

    weekly_off:
      weeklyOff,

    benefits,

    requirements,

    joining_date:
      joiningDate,

    application_deadline:
      applicationDeadline,

    terms_version:
      input.terms_version ||
      "2026-09-10",

    terms_accepted_at:
      acceptedAt,

    privacy_version:
      input.privacy_version ||
      "2026-09-10",

    privacy_accepted_at:
      input.privacy_accepted_at ||
      acceptedAt,

    rules_version:
      input.rules_version ||
      "2026-09-10",

    rules_accepted_at:
      acceptedAt,
  };


  // -------------------------------------------------------
  // DEBUG LOG
  // -------------------------------------------------------

  console.log(
    "[GAMEZONE ARENA] SAVE JOB",
    {
      operation:
        id
          ? "UPDATE"
          : "INSERT",

      id:
        id ?? "new",

      categoryId,

      title,

      companyName,

      employerName,

      city,

      area,

      location:
        generatedLocation,

      latitude:
        safeLatitude,

      longitude:
        safeLongitude,

      workType,

      workplaceType,

      requiredSkillsCount:
        requiredSkills.length,
    }
  );


  // -------------------------------------------------------
  // INSERT / UPDATE
  // -------------------------------------------------------

  let query;

  if (id) {
    query = db()
      .from("jobs")
      .update({
        ...row,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        id
      );
  } else {
    query = db()
      .from("jobs")
      .insert(row);
  }


  // -------------------------------------------------------
  // EXECUTE DATABASE REQUEST
  // -------------------------------------------------------

  const result =
    await query
      .select(jc)
      .single();


  // -------------------------------------------------------
  // DATABASE ERROR
  // -------------------------------------------------------

  if (result.error) {
    console.error(
      "[GAMEZONE ARENA] JOB DATABASE ERROR:",
      result.error
    );

    throw new Error(
      `Job save failed: ${
        result.error.message ||
        "Unknown database error"
      }`
    );
  }


  // -------------------------------------------------------
  // NO DATA ERROR
  // -------------------------------------------------------

  if (!result.data) {
    throw new Error(
      "Job was saved but no job record was returned."
    );
  }


  // -------------------------------------------------------
  // FORMAT SAVED JOB
  // -------------------------------------------------------

  let formattedJobs;

  try {
    formattedJobs =
      await names([
        result.data as Job,
      ]);
  } catch (formatError) {
    console.error(
      "[GAMEZONE ARENA] JOB FORMAT ERROR:",
      formatError
    );

    throw new Error(
      "Job was saved, but the saved job could not be loaded correctly."
    );
  }

  const job =
    formattedJobs?.[0];


  // -------------------------------------------------------
  // FORMATTING VALIDATION
  // -------------------------------------------------------

  if (!job) {
    throw new Error(
      "Job was saved but could not be formatted."
    );
  }


  // -------------------------------------------------------
  // SAVE CONTACT INFORMATION
  // -------------------------------------------------------
  // Contact failure must NOT delete/fail the main job.
  // No instanceof check is used here.
  // -------------------------------------------------------

  try {
    await saveContact(
      result.data.id,
      contact
    );

    console.log(
      "[GAMEZONE ARENA] CONTACT INFORMATION SAVED:",
      result.data.id
    );
  } catch (contactError) {
    console.error(
      "[GAMEZONE ARENA] CONTACT SAVE ERROR:",
      contactError
    );

    console.warn(
      "[GAMEZONE ARENA] JOB SAVED SUCCESSFULLY. CONTACT SAVE FAILED, CONTINUING."
    );
  }


  // -------------------------------------------------------
  // SUCCESS
  // -------------------------------------------------------

  console.log(
    "[GAMEZONE ARENA] JOB SAVED SUCCESSFULLY:",
    result.data.id
  );

  return job;
}