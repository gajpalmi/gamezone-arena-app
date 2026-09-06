import { publicSupabase, supabase } from "@/lib/supabase";
import type { BusinessStatus, ReportReason } from "@/lib/business";

export type OfferingKind = "product" | "service";
export type BusinessOffering = { id: string; owner_user_id: string; business_id: string | null; kind: OfferingKind; name: string; category: string; subcategory: string | null; description: string; price: number | null; price_unit: string; in_stock: boolean; city: string; area: string | null; location_text: string | null; service_area: string | null; contact_phone: string; whatsapp: string | null; delivery_info: string | null; availability_hours: string | null; is_enabled: boolean; contact_public_consent_at:string|null; terms_version:string|null; terms_accepted_at:string|null; status: BusinessStatus; rejection_reason: string | null; created_at: string; updated_at: string };
export type OfferingInput = Omit<BusinessOffering, "id" | "owner_user_id" | "status" | "rejection_reason" | "created_at" | "updated_at">;
export type OfferingFilters = { query?: string; kind?: OfferingKind; category?: string; city?: string; area?: string; minPrice?: number; maxPrice?: number };
const columns = "id,owner_user_id,business_id,kind,name,category,subcategory,description,price,price_unit,in_stock,city,area,location_text,service_area,contact_phone,whatsapp,delivery_info,availability_hours,is_enabled,contact_public_consent_at,terms_version,terms_accepted_at,status,rejection_reason,created_at,updated_at";
const db = () => { if (!supabase) throw new Error("Offerings are unavailable: Supabase is not configured."); return supabase; };
const fail = (error: { code?: string; message: string; details?: string; hint?: string } | null, operation = "unknown", table = "unknown") => {
  if (error) {
    console.error("Offering database operation failed", { table, operation, code: error.code, message: error.message, details: error.details, hint: error.hint });
    throw new Error(`Offering service error: ${error.message}`);
  }
};
const text = (v: string | null | undefined, n: number) => { const x = v?.trim() ?? ""; if (x.length > n) throw new Error(`Value must be ${n} characters or fewer.`); return x || null; };
function valid(input: OfferingInput) {
  if (!input.name.trim() || !input.category.trim() || !input.subcategory?.trim() || !input.description.trim() || !input.city.trim() || !input.contact_phone.trim()) throw new Error("Name, category, subcategory, description, city, and contact phone are required.");
  if (!/^\+?[0-9][0-9 ()-]{6,38}$/.test(input.contact_phone.trim())) throw new Error("Enter a valid contact phone.");
  if (input.whatsapp?.trim() && !/^\+?[0-9][0-9 ()-]{6,38}$/.test(input.whatsapp.trim())) throw new Error("Enter a valid WhatsApp number.");
  if (input.price != null && (!Number.isFinite(input.price) || input.price < 0)) throw new Error("Price must be a positive number.");
}
function clean(input: OfferingInput) {
  valid(input);
  return { ...input, name: input.name.trim(), category: input.category.trim(), subcategory: text(input.subcategory, 120), city: input.city.trim(), description: text(input.description, 5000) ?? "", price_unit: text(input.price_unit, 80) ?? "per item", area: text(input.area, 120), location_text: text(input.location_text, 500), service_area: text(input.service_area, 500), contact_phone: input.contact_phone.trim(), whatsapp: text(input.whatsapp, 40), delivery_info: text(input.delivery_info, 1000), availability_hours: text(input.availability_hours, 500) };
}
export type OfferingCategory = { id: string; kind: OfferingKind; slug: string; name: string; parent_id: string | null; sort_order: number };
export async function offeringCategories(kind: OfferingKind) {
  if (!publicSupabase) throw new Error("Offering categories are unavailable: Supabase is not configured.");
  const { data, error } = await publicSupabase.from("offering_categories").select("id,kind,slug,name,parent_id,sort_order").eq("kind", kind).eq("is_active", true).order("sort_order").order("name");
  if (error) console.error("Category query failed", { scope: kind, table: "offering_categories", parameters: { kind, is_active: true, order: ["sort_order", "name"] }, code: error.code, message: error.message, details: error.details, hint: error.hint });
  fail(error); return (data ?? []) as OfferingCategory[];
}
export async function browseOfferings(filters: OfferingFilters = {}): Promise<BusinessOffering[]> {
  let q = db().from("business_offerings").select(columns).eq("status", "approved").eq("is_enabled", true);
  if (filters.kind) q = q.eq("kind", filters.kind); if (filters.category?.trim()) q = q.ilike("category", `%${filters.category.trim()}%`); if (filters.city?.trim()) q = q.ilike("city", `%${filters.city.trim()}%`); if (filters.area?.trim()) q = q.ilike("area", `%${filters.area.trim()}%`); if (filters.minPrice != null) q = q.gte("price", filters.minPrice); if (filters.maxPrice != null) q = q.lte("price", filters.maxPrice);
  if (filters.query?.trim()) { const s = filters.query.replace(/[%,()]/g, " "); q = q.or(`name.ilike.%${s}%,description.ilike.%${s}%,category.ilike.%${s}%`); }
  const { data, error } = await q.order("created_at", { ascending: false }); fail(error); return (data ?? []) as BusinessOffering[];
}
export async function getOffering(id: string) { const [o, p, r, favorite] = await Promise.all([db().from("business_offerings").select(columns).eq("id", id).single(), db().from("business_offering_photos").select("id,storage_path,alt_text,sort_order").eq("offering_id", id).order("sort_order"), db().from("business_offering_reviews").select("*").eq("offering_id", id).eq("is_approved", true), db().from("business_offering_favorites").select("offering_id").eq("offering_id", id).maybeSingle()]); fail(o.error); fail(p.error); fail(r.error); fail(favorite.error); const paths = (p.data ?? []).map(x => x.storage_path); const signed = paths.length ? await db().storage.from("business-media").createSignedUrls(paths, 600) : { data: [], error: null }; fail(signed.error); const map = new Map((signed.data ?? []).map(x => [x.path, x.signedUrl])); return { offering: o.data as BusinessOffering, photos: (p.data ?? []).map(x => ({ ...x, signedUrl: map.get(x.storage_path) })), reviews: r.data ?? [], isSaved: !!favorite.data }; }
export async function myOfferings() { const { data, error } = await db().from("business_offerings").select(columns).order("updated_at", { ascending: false }); fail(error); return (data ?? []) as BusinessOffering[]; }
export async function saveOffering(input: OfferingInput, id?: string) { const q = id ? db().from("business_offerings").update({ ...clean(input), updated_at: new Date().toISOString() }).eq("id", id) : db().from("business_offerings").insert(clean(input)); const { data, error } = await q.select(columns).single(); fail(error, id ? "update" : "insert", "business_offerings"); return data as BusinessOffering; }
export async function deleteOffering(id: string) { const { error } = await db().from("business_offerings").delete().eq("id", id); fail(error); }
export async function submitOffering(id: string) { const { data, error } = await db().rpc("business_offering_submit", { p_offering_id: id }); fail(error, "submit", "business_offerings"); return data as BusinessOffering; }
export async function setOfferingEnabled(id: string, isEnabled: boolean) { const { data, error } = await db().rpc("business_offering_set_enabled", { p_offering_id: id, p_is_enabled: isEnabled }); fail(error); return data as BusinessOffering; }
export function sanitizeOfferingFilename(filename: string) { const base = filename.split(/[\\/]/).pop()?.toLowerCase().replace(/[^a-z0-9._-]/g, "-") || ""; const ext = base.split(".").pop(); if (!["jpg","jpeg","png","webp"].includes(ext ?? "")) throw new Error("Only JPG, PNG, and WebP images are accepted."); return `${Date.now()}-${base.slice(0, 100)}`; }
export async function uploadOfferingPhoto(offeringId: string, filename: string, file: Blob, contentType: "image/jpeg"|"image/png"|"image/webp", altText?: string) {
  const safe = sanitizeOfferingFilename(filename); const ext = safe.split(".").pop()!; const expected = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  if (contentType !== expected || file.size <= 0 || file.size > 5 * 1024 * 1024) throw new Error("Use a matching JPG, PNG, or WebP image up to 5 MB.");
  const { data: prefix, error: prefixError } = await db().rpc("business_offering_prepare_photo", { p_offering_id: offeringId, p_extension: ext }); fail(prefixError);
  const storage_path = `${prefix}${safe}`; const { error: storageError } = await db().storage.from("business-media").upload(storage_path, file, { contentType, upsert: false }); fail(storageError);
  const { data, error } = await db().from("business_offering_photos").insert({ offering_id: offeringId, storage_path, alt_text: text(altText, 240) }).select().single();
  if (error) { await db().storage.from("business-media").remove([storage_path]); fail(error); } return data;
}
export async function deleteOfferingPhoto(photo: { id: string; storage_path: string }) { const { error } = await db().storage.from("business-media").remove([photo.storage_path]); fail(error); const result = await db().from("business_offering_photos").delete().eq("id", photo.id); fail(result.error); }
export async function offeringFavorite(id: string, on: boolean) { const { error } = on ? await db().from("business_offering_favorites").insert({ offering_id: id }) : await db().from("business_offering_favorites").delete().eq("offering_id", id); fail(error); }
export async function savedOfferings() { const { data, error } = await db().from("business_offering_favorites").select(`offering_id,business_offerings(${columns})`); fail(error); return (data ?? []).map((x: any) => x.business_offerings).filter(Boolean) as BusinessOffering[]; }
export async function offeringReview(id: string, rating: number, body: string) { if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Rating must be 1 to 5."); const { error } = await db().from("business_offering_reviews").upsert({ offering_id: id, rating, body: text(body, 2000) ?? "" }, { onConflict: "offering_id,user_id" }); fail(error); }
export async function offeringReport(id: string, reason: ReportReason, details?: string) { const { error } = await db().from("business_offering_reports").insert({ offering_id: id, reason, details: text(details, 2000) }); fail(error); }
export async function offeringBlock(id: string, blocked: boolean) { const { error } = blocked ? await db().from("business_offering_blocks").insert({ offering_id: id }) : await db().from("business_offering_blocks").delete().eq("offering_id", id); fail(error); }
export async function adminOfferingQueue() { const [o, r] = await Promise.all([db().from("business_offerings").select(columns).eq("status", "pending"), db().from("business_offering_reports").select("*").is("resolved_at", null)]); fail(o.error); fail(r.error); return { offerings: (o.data ?? []) as BusinessOffering[], reports: r.data ?? [] }; }
export async function moderateOffering(id: string, action: "approve" | "reject" | "suspend", reason?: string) { const { error } = await db().rpc("business_offering_admin_moderate", { p_offering_id: id, p_action: action, p_reason: reason?.trim() || null }); fail(error); }
export async function resolveOfferingReport(id: string) { const { error } = await db().rpc("business_offering_admin_resolve_report", { p_report_id: id }); fail(error); }