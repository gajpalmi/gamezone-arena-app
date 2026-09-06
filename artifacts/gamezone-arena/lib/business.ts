import { BUSINESS_REPORT_REASONS } from "@/constants/business";
import { publicSupabase, supabase } from "@/lib/supabase";

export type BusinessStatus = "draft" | "pending" | "approved" | "rejected" | "suspended";
export type ReportReason = (typeof BUSINESS_REPORT_REASONS)[number];
export type Business = {
  id: string; owner_id: string; category_id: string; name: string; description: string;
  phone: string | null; email: string | null; website: string | null; address: string | null;
  city: string | null; latitude: number | null; longitude: number | null; status: BusinessStatus;
  owner_name: string | null; owner_display_name: string | null; subcategory: string | null; whatsapp: string | null; service_areas: string[]; services_offered: string[]; price_range: string | null; public_contact_consent_at: string | null;
  terms_version: string | null; terms_accepted_at: string | null; privacy_version: string | null; privacy_accepted_at: string | null; listing_rules_version: string | null; listing_rules_accepted_at: string | null;
  submitted_at: string | null; approved_at: string | null; rejection_reason: string | null;
  created_at: string; updated_at: string;
  business_categories?: { id: string; slug: string; name: string };
  business_photos?: BusinessPhoto[];
};
export type BusinessCategory = { id: string; slug: string; name: string; description: string | null; sort_order: number };
export type BusinessHours = { day_of_week: number; opens_at: string | null; closes_at: string | null; is_closed: boolean };
export type BusinessPhoto = { id: string; business_id: string; storage_path: string; alt_text: string | null; sort_order: number; is_logo?: boolean; created_at: string; signedUrl?: string };
export type BusinessReview = { id: string; business_id: string; user_id: string; rating: number; body: string; is_approved: boolean; created_at: string; updated_at: string };
export type BrowseOptions = { categoryId?: string; city?: string; query?: string; page?: number; pageSize?: number };
export type BusinessInput = Pick<Business, "category_id" | "name" | "city" | "phone" | "terms_version" | "terms_accepted_at" | "privacy_version" | "privacy_accepted_at" | "listing_rules_version" | "listing_rules_accepted_at"> & Partial<Pick<Business, "description" | "email" | "website" | "address" | "latitude" | "longitude" | "owner_name" | "owner_display_name" | "subcategory" | "whatsapp" | "service_areas" | "services_offered" | "price_range" | "public_contact_consent_at">>;

const MAX_PAGE_SIZE = 50;
const businessColumns = "id,owner_id,category_id,name,description,phone,email,website,address,city,latitude,longitude,owner_name,owner_display_name,subcategory,whatsapp,service_areas,services_offered,price_range,public_contact_consent_at,terms_version,terms_accepted_at,privacy_version,privacy_accepted_at,listing_rules_version,listing_rules_accepted_at,status,submitted_at,approved_at,rejection_reason,created_at,updated_at";
const LEGAL_VERSION = "2026-09-06";
let pendingAccountPhotoDeletion: string[] | null = null;

function client() {
  if (!supabase) throw new Error("Business services are unavailable: Supabase is not configured.");
  return supabase;
}
function fail(error: { code?: string; message: string; details?: string; hint?: string } | null, operation = "unknown", table = "unknown") {
  if (error) {
    console.error("Business database operation failed", { table, operation, code: error.code, message: error.message, details: error.details, hint: error.hint });
    throw new Error(`Business service error: ${error.message}`);
  }
}
function cleanText(value: string | null | undefined, max: number) {
  if (value == null) return null;
  const result = value.trim();
  if (result.length > max) throw new Error(`Value must be ${max} characters or fewer.`);
  return result || null;
}
function validateBusiness(input: BusinessInput) {
  if (!input.category_id || !input.name?.trim() || input.name.trim().length > 120 || !input.city?.trim() || !input.phone?.trim()) throw new Error("Name, category, city, and phone are required.");
  if (input.name.trim().length < 2) throw new Error("Business name must be at least 2 characters.");
  if (!/^\+?[0-9][0-9 ()-]{6,38}$/.test(input.phone.trim())) throw new Error("Enter a valid phone number.");
  if (input.whatsapp?.trim() && !/^\+?[0-9][0-9 ()-]{6,38}$/.test(input.whatsapp.trim())) throw new Error("Enter a valid WhatsApp number.");
  if (input.website?.trim() && !/^https?:\/\/[^\s]+$/i.test(input.website.trim())) throw new Error("Website must start with http:// or https://.");
  if ((input.description ?? "").length > 5000) throw new Error("Description must be 5,000 characters or fewer.");
  if (input.latitude != null && (input.latitude < -90 || input.latitude > 90)) throw new Error("Latitude is invalid.");
  if (input.longitude != null && (input.longitude < -180 || input.longitude > 180)) throw new Error("Longitude is invalid.");
}
function normalizedInput(input: BusinessInput) {
  validateBusiness(input);
  const serviceAreas = (input.service_areas ?? []).map((area) => area.trim()).filter(Boolean);
  if (serviceAreas.length > 20 || serviceAreas.some((area) => area.length > 120)) throw new Error("Provide at most 20 service areas of 120 characters each.");
  return { ...input, name: input.name.trim(), description: input.description?.trim() ?? "", phone: cleanText(input.phone, 40), email: cleanText(input.email, 254), website: cleanText(input.website, 2048), address: cleanText(input.address, 500), city: cleanText(input.city, 120), owner_name: cleanText(input.owner_name, 120), owner_display_name: cleanText(input.owner_display_name,120), subcategory: cleanText(input.subcategory,120), whatsapp: cleanText(input.whatsapp, 40), service_areas: serviceAreas, services_offered:(input.services_offered??[]).map(x=>x.trim()).filter(Boolean),price_range:cleanText(input.price_range,120) };
}
export async function saveBusinessHours(businessId: string, hours: BusinessHours[]) { const { error } = await client().from("business_hours").upsert(hours.map(hour => ({ ...hour, business_id: businessId })), { onConflict: "business_id,day_of_week" }); fail(error); }

export async function listCategories(): Promise<BusinessCategory[]> {
  if (!publicSupabase) throw new Error("Business categories are unavailable: Supabase is not configured.");
  const { data, error } = await publicSupabase.from("business_categories").select("id,slug,name,description,sort_order").order("sort_order");
  if (error) console.error("Category query failed", { scope: "business", table: "business_categories", parameters: { order: "sort_order" }, code: error.code, message: error.message, details: error.details, hint: error.hint });
  fail(error); return (data ?? []) as BusinessCategory[];
}

export async function browseBusinesses(options: BrowseOptions = {}) {
  const page = Math.max(0, options.page ?? 0);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, options.pageSize ?? 20));
  let query = client().from("businesses").select(`${businessColumns},business_categories(id,slug,name)`, { count: "exact" }).eq("status", "approved");
  if (options.categoryId) query = query.eq("category_id", options.categoryId);
  if (options.city?.trim()) query = query.ilike("city", `%${options.city.trim()}%`);
  if (options.query?.trim()) query = query.or(`name.ilike.%${options.query.trim().replace(/[%,()]/g, " ")}%,description.ilike.%${options.query.trim().replace(/[%,()]/g, " ")}%`);
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1);
  fail(error);
  const blocked = await listBlockedBusinessIds();
  return { data: ((data ?? []) as unknown as Business[]).filter((business) => !blocked.has(business.id)), count: count ?? 0, page, pageSize };
}

export async function getBusinessDetail(id: string) {
  if (!id) throw new Error("Business id is required.");
  if ((await listBlockedBusinessIds()).has(id)) throw new Error("This business is blocked.");
  const db = client();
  const [{ data: business, error }, { data: hours, error: hoursError }, { data: photos, error: photosError }, { data: reviews, error: reviewsError }] = await Promise.all([
    db.from("businesses").select(`${businessColumns},business_categories(id,slug,name)`).eq("id", id).single(),
    db.from("business_hours").select("day_of_week,opens_at,closes_at,is_closed").eq("business_id", id).order("day_of_week"),
    db.from("business_photos").select("id,business_id,storage_path,alt_text,sort_order,is_logo,created_at").eq("business_id", id).order("sort_order"),
    db.from("business_reviews").select("id,business_id,user_id,rating,body,is_approved,created_at,updated_at").eq("business_id", id).eq("is_approved", true).order("created_at", { ascending: false }),
  ]);
  fail(error); fail(hoursError); fail(photosError); fail(reviewsError);
  const rawPhotos = (photos ?? []) as BusinessPhoto[];
  const { data: signed, error: signedError } = rawPhotos.length ? await db.storage.from("business-media").createSignedUrls(rawPhotos.map((photo) => photo.storage_path), 60 * 10) : { data: [], error: null };
  fail(signedError);
  const signedByPath = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));
  return { business: business as unknown as Business, hours: (hours ?? []) as BusinessHours[], photos: rawPhotos.map((photo) => ({ ...photo, signedUrl: signedByPath.get(photo.storage_path) ?? undefined })), reviews: (reviews ?? []) as BusinessReview[] };
}

export async function listMyBusinesses(): Promise<Business[]> {
  const db = client();
  const { data, error } = await db.from("businesses").select(`${businessColumns},business_photos(id,business_id,storage_path,alt_text,sort_order,is_logo,created_at)`).order("updated_at", { ascending: false });
  fail(error);
  const businesses = (data ?? []) as unknown as Business[];
  const paths = businesses.flatMap((business) => business.business_photos ?? []).map((photo) => photo.storage_path);
  const { data: signed, error: signedError } = paths.length ? await db.storage.from("business-media").createSignedUrls(paths, 60 * 10) : { data: [], error: null };
  fail(signedError);
  const signedByPath = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));
  return businesses.map((business) => ({ ...business, business_photos: (business.business_photos ?? []).map((photo) => ({ ...photo, signedUrl: signedByPath.get(photo.storage_path) ?? undefined })) }));
}
export async function createBusiness(input: BusinessInput): Promise<Business> {
  const { data, error } = await client().from("businesses").insert(normalizedInput(input)).select(businessColumns).single();
  fail(error, "insert", "businesses"); return data as Business;
}
export async function updateBusiness(id: string, input: BusinessInput): Promise<Business> {
  if (!id) throw new Error("Business id is required.");
  const { data, error } = await client().from("businesses").update({ ...normalizedInput(input), updated_at: new Date().toISOString() }).eq("id", id).select(businessColumns).single();
  fail(error, "update", "businesses"); return data as Business;
}
export async function deleteBusiness(id: string) {
  const { error } = await client().from("businesses").delete().eq("id", id); fail(error);
}
export async function submitBusiness(id: string): Promise<Business> {
  const { data, error } = await client().rpc("business_submit", { p_business_id: id }); fail(error, "submit", "businesses"); return data as Business;
}

export async function setFavorite(businessId: string, favorite: boolean) {
  const db = client();
  const { error } = favorite ? await db.from("business_favorites").insert({ business_id: businessId }) : await db.from("business_favorites").delete().eq("business_id", businessId);
  fail(error);
}
export async function listFavorites(): Promise<Business[]> {
  const { data, error } = await client().from("business_favorites").select(`business_id, businesses(${businessColumns})`);
  fail(error);
  const blocked = await listBlockedBusinessIds();
  return (data ?? []).map((row: any) => row.businesses as Business).filter((business) => business?.status === "approved" && !blocked.has(business.id));
}
export async function saveReview(businessId: string, rating: number, body: string) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Rating must be between 1 and 5.");
  const text = cleanText(body, 2000) ?? "";
  const { data, error } = await client().from("business_reviews").upsert({ business_id: businessId, rating, body: text }, { onConflict: "business_id,user_id" }).select().single();
  fail(error); return data as BusinessReview;
}
export async function reportBusiness(businessId: string, reason: ReportReason, details?: string) {
  if (!BUSINESS_REPORT_REASONS.includes(reason)) throw new Error("Invalid report reason.");
  const { error } = await client().from("business_reports").insert({ business_id: businessId, reason, details: cleanText(details, 2000) }); fail(error);
}
export async function reportReview(reviewId: string, reason: ReportReason, details?: string) {
  if (!BUSINESS_REPORT_REASONS.includes(reason)) throw new Error("Invalid report reason.");
  const { error } = await client().from("business_reports").insert({ review_id: reviewId, reason, details: cleanText(details, 2000) }); fail(error);
}
export async function setBusinessBlocked(businessId: string, blocked: boolean) {
  const db = client(); const { error } = blocked ? await db.from("business_blocks").insert({ business_id: businessId }) : await db.from("business_blocks").delete().eq("business_id", businessId); fail(error);
}
export async function listBlockedBusinessIds(): Promise<Set<string>> {
  const { data, error } = await client().from("business_blocks").select("business_id"); fail(error);
  return new Set((data ?? []).map((row) => row.business_id as string));
}

export async function adminQueue(limit = 50) {
  const safeLimit = Math.min(100, Math.max(1, limit));
  const [businesses, reports] = await Promise.all([
    client().from("businesses").select(businessColumns).eq("status", "pending").order("submitted_at").limit(safeLimit),
    client().from("business_reports").select("*").is("resolved_at", null).order("created_at").limit(safeLimit),
  ]);
  fail(businesses.error); fail(reports.error); return { businesses: (businesses.data ?? []) as Business[], reports: reports.data ?? [] };
}
export async function isBusinessAdmin(): Promise<boolean> {
  const { data, error } = await client().rpc("business_is_admin");
  fail(error);
  return data === true;
}
export async function adminModerate(targetType: "business" | "review" | "report", targetId: string, action: string, reason?: string) {
  if (!targetId || !action.trim()) throw new Error("Target and action are required.");
  const { error } = await client().rpc("business_admin_moderate", { p_target_type: targetType, p_target_id: targetId, p_action: action.trim(), p_reason: cleanText(reason, 2000) });
  fail(error);
}

export function sanitizeBusinessFilename(filename: string) {
  const base = filename.split(/[\\/]/).pop()?.toLowerCase().replace(/[^a-z0-9._-]/g, "-").replace(/-+/g, "-") || "";
  const extension = base.split(".").pop();
  if (!["jpg", "jpeg", "png", "webp"].includes(extension ?? "")) throw new Error("Only JPG, PNG, and WebP images are accepted.");
  return `${Date.now()}-${base.slice(0, 100)}`;
}
export async function uploadBusinessImage(businessId: string, filename: string, file: Blob | ArrayBuffer, contentType: "image/jpeg" | "image/png" | "image/webp", altText?: string) {
  if (!businessId) throw new Error("A business id is required.");
  const safeFilename = sanitizeBusinessFilename(filename);
  const extension = safeFilename.split(".").pop()!;
  const expectedMime = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";
  if (contentType !== expectedMime || !["image/jpeg", "image/png", "image/webp"].includes(contentType)) throw new Error("Image filename and MIME type must match.");
  const size = file instanceof ArrayBuffer ? file.byteLength : file.size;
  if (!Number.isFinite(size) || size <= 0 || size > 5 * 1024 * 1024) throw new Error("Images must be between 1 byte and 5 MB.");
  const db = client();
  const { data: prefix, error: prefixError } = await db.rpc("business_prepare_photo", { p_business_id: businessId, p_extension: extension });
  fail(prefixError);
  if (!prefix) throw new Error("Photo upload is not authorized for this listing.");
  const storagePath = `${prefix}${safeFilename}`;
  const { error: uploadError } = await db.storage.from("business-media").upload(storagePath, file, { contentType, upsert: false }); fail(uploadError);
  const { data, error } = await db.from("business_photos").insert({ business_id: businessId, storage_path: storagePath, alt_text: cleanText(altText, 240) }).select().single();
  if (error) { await db.storage.from("business-media").remove([storagePath]); fail(error); }
  return data as BusinessPhoto;
}
export async function deleteBusinessImage(photo: BusinessPhoto) {
  const db = client();
  const { error: storageError } = await db.storage.from("business-media").remove([photo.storage_path]);
  fail(storageError);
  const { error } = await db.from("business_photos").delete().eq("id", photo.id);
  fail(error);
}
export async function setBusinessLogo(photoId: string) {
  const { data: photo, error: readError } = await client().from("business_photos").select("id,business_id").eq("id", photoId).single(); fail(readError);
  if (!photo) throw new Error("Business photo was not found.");
  const { error: clearError } = await client().from("business_photos").update({ is_logo: false }).eq("business_id", photo.business_id); fail(clearError);
  const { error } = await client().from("business_photos").update({ is_logo: true }).eq("id", photoId); fail(error);
}

export async function deleteUserData() {
  const db = client();
  if (!pendingAccountPhotoDeletion) {
    const { data: paths, error } = await db.rpc("business_delete_user_data");
    fail(error);
    pendingAccountPhotoDeletion = (paths ?? []) as string[];
  }
  if (pendingAccountPhotoDeletion.length) {
    const businessMediaPaths = pendingAccountPhotoDeletion.filter((path) => !path.startsWith("job-seekers/") && !path.startsWith("job-resumes/"));
    const jobMediaPaths = pendingAccountPhotoDeletion.filter((path) => path.startsWith("job-seekers/") || path.startsWith("job-resumes/"));
    const failures: string[] = [];
    if (businessMediaPaths.length) {
      const { error } = await db.storage.from("business-media").remove(businessMediaPaths);
      if (error) failures.push(`business media: ${error.message}`);
    }
    if (jobMediaPaths.length) {
      const { error } = await db.storage.from("job-private-media").remove(jobMediaPaths);
      if (error) failures.push(`job private media: ${error.message}`);
    }
    if (failures.length) throw new Error(`Account data was removed, but private photos could not be removed. Retry before deleting your account: ${failures.join("; ")}`);
  }
  pendingAccountPhotoDeletion = null;
}