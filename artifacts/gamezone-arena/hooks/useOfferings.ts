import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/offerings";

const invalidate = (q: ReturnType<typeof useQueryClient>) => Promise.all([
  q.invalidateQueries({ queryKey: ["offerings"] }),
  q.invalidateQueries({ queryKey: ["offering"] }),
  q.invalidateQueries({ queryKey: ["offerings", "mine"] }),
]);
export const useOfferings = (filters: api.OfferingFilters = {}) => useQuery({ queryKey: ["offerings", filters], queryFn: () => api.browseOfferings(filters) });
export const useOffering = (id: string) => useQuery({ queryKey: ["offering", id], queryFn: () => api.getOffering(id), enabled: !!id });
export const useMyOffering = (id: string) => useQuery({ queryKey: ["offering", "mine", id], queryFn: () => api.getMyOffering(id), enabled: !!id });
export const useMyOfferings = (enabled = true) => useQuery({ queryKey: ["offerings", "mine"], queryFn: api.myOfferings, enabled });
export const useSavedOfferings = (enabled = true) => useQuery({ queryKey: ["offerings", "saved"], queryFn: api.savedOfferings, enabled });
export const useOfferingBasket = (enabled = true) => useQuery({ queryKey: ["offerings", "basket"], queryFn: api.myOfferingBasket, enabled });
export const useOfferingBasketCount = (enabled = true) => useQuery({ queryKey: ["offerings", "basket-count"], queryFn: api.offeringBasketCount, enabled });
export const useOfferingCategories = (kind: api.OfferingKind, enabled = true) => useQuery({ queryKey: ["offering-categories", kind], queryFn: async () => { try { return await api.offeringCategories(kind); } catch (error) { console.error("Offering category query failed", error); throw error; } }, enabled });
export function useSaveOffering(id?: string) { const q = useQueryClient(); return useMutation({ mutationFn: (input: api.OfferingInput) => api.saveOffering(input, id), onSuccess: () => invalidate(q) }); }
export function useOfferingAction() { const q = useQueryClient(); return useMutation({ mutationFn: async ({ type, id, value, reason }: { type: "delete" | "submit" | "enable" | "favorite" | "block" | "review" | "report" | "moderate" | "resolve-report"; id: string; value?: any; reason?: string }) => { if (type === "delete") return api.deleteOffering(id); if (type === "submit") return api.submitOffering(id); if (type === "enable") return api.setOfferingEnabled(id, !!value); if (type === "favorite") return api.offeringFavorite(id, !!value); if (type === "block") return api.offeringBlock(id, !!value); if (type === "review") return api.offeringReview(id, value.rating, value.body); if (type === "report") return api.offeringReport(id, value, reason); if (type === "resolve-report") return api.resolveOfferingReport(id); return api.moderateOffering(id, value, reason); }, onSuccess: () => invalidate(q) }); }
export function useOfferingPhoto() { const q = useQueryClient(); return useMutation({ mutationFn: ({ offeringId, filename, file, contentType, altText }: { offeringId: string; filename: string; file: Blob; contentType: "image/jpeg"|"image/png"|"image/webp"; altText?: string }) => api.uploadOfferingPhoto(offeringId, filename, file, contentType, altText), onSuccess: () => invalidate(q) }); }
export function useDeleteOfferingPhoto() { const q = useQueryClient(); return useMutation({ mutationFn: (photo: { id: string; storage_path: string; offering_id: string }) => api.deleteOfferingPhoto(photo), onSuccess: () => invalidate(q) }); }
export const useOfferingAdminQueue = (enabled: boolean) => useQuery({ queryKey: ["offerings", "admin"], queryFn: api.adminOfferingQueue, enabled });
export function useOfferingBasketAction(){const q=useQueryClient();return useMutation({mutationFn:async({type,id}:{type:"add"|"cancel";id:string})=>{if(type==="add")await api.addOfferingToBasket(id);else await api.cancelBasketItem(id)},onSuccess:()=>{q.invalidateQueries({queryKey:["offerings","basket"]});q.invalidateQueries({queryKey:["offerings","basket-count"]})}})}