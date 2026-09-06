import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/business';
import { useAuth } from '@clerk/expo';
import { setSupabaseAccessTokenGetter } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export function useSupabaseAuth() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setSupabaseAccessTokenGetter(() => getToken());
    setReady(Boolean(isLoaded && isSignedIn));
    return () => {
      setReady(false);
      setSupabaseAccessTokenGetter(null);
    };
  }, [getToken, isLoaded, isSignedIn]);
  return { ready, isLoaded: Boolean(isLoaded), isSignedIn: Boolean(isSignedIn) };
}

export function useCategories(enabled = true) {
  return useQuery({
    queryKey: ['business-categories'],
    queryFn: () => api.listCategories(),
    enabled,
  });
}

export function useBrowseBusinesses(options: api.BrowseOptions) {
  return useQuery({
    queryKey: ['businesses', options],
    queryFn: () => api.browseBusinesses(options),
  });
}

export function useBusinessDetail(id: string) {
  return useQuery({
    queryKey: ['business', id],
    queryFn: () => api.getBusinessDetail(id),
    enabled: !!id,
  });
}

export function useMyBusinesses() {
  return useQuery({
    queryKey: ['my-businesses'],
    queryFn: () => api.listMyBusinesses(),
  });
}

export function useCreateBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: api.BusinessInput) => api.createBusiness(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
    },
  });
}

export function useUpdateBusiness(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: api.BusinessInput) => api.updateBusiness(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['business', id] });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
    },
  });
}

export function useDeleteBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteBusiness(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['my-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['business', id] });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
    },
  });
}

export function useSubmitBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.submitBusiness(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['my-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['business', id] });
    },
  });
}

export function useFavorites() {
  return useQuery({
    queryKey: ['business-favorites'],
    queryFn: () => api.listFavorites(),
  });
}

export function useSetFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) => api.setFavorite(id, favorite),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['business-favorites'] });
      queryClient.invalidateQueries({ queryKey: ['business', id] });
    },
  });
}

export function useSaveReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rating, body }: { id: string; rating: number; body: string }) => api.saveReview(id, rating, body),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['business', id] });
    },
  });
}

export function useReportBusiness() {
  return useMutation({
    mutationFn: ({ id, reason, details }: { id: string; reason: api.ReportReason; details?: string }) => api.reportBusiness(id, reason, details),
  });
}

export function useReportReview() {
  return useMutation({
    mutationFn: ({ id, reason, details }: { id: string; reason: api.ReportReason; details?: string }) => api.reportReview(id, reason, details),
  });
}

export function useSetBusinessBlocked() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, blocked }: { id: string; blocked: boolean }) => api.setBusinessBlocked(id, blocked),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['business'] });
    },
  });
}

export function useAdminQueue(enabled = true) {
  return useQuery({
    queryKey: ['business-admin-queue'],
    queryFn: () => api.adminQueue(),
    enabled,
  });
}
export function useBusinessAdmin() {
  return useQuery({
    queryKey: ['business-is-admin'],
    queryFn: () => api.isBusinessAdmin(),
    staleTime: 60_000,
  });
}

export function useAdminModerate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ targetType, targetId, action, reason }: { targetType: "business" | "review" | "report"; targetId: string; action: string; reason?: string }) => api.adminModerate(targetType, targetId, action, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-admin-queue'] });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['business'] });
    },
  });
}

export function useUploadBusinessImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ businessId, filename, file, contentType, altText }: { businessId: string; filename: string; file: Blob | ArrayBuffer; contentType: "image/jpeg" | "image/png" | "image/webp"; altText?: string }) => api.uploadBusinessImage(businessId, filename, file, contentType, altText),
    onSuccess: (_, { businessId }) => {
      queryClient.invalidateQueries({ queryKey: ['business', businessId] });
    },
  });
}

export function useDeleteBusinessImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photo: api.BusinessPhoto) => api.deleteBusinessImage(photo),
    onSuccess: (_, photo) => {
      queryClient.invalidateQueries({ queryKey: ['business', photo.business_id] });
    },
  });
}

export function useDeleteUserData() {
  return useMutation({
    mutationFn: () => api.deleteUserData(),
  });
}
