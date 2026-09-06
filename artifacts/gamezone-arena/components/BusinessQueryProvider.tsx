import React, { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/expo';
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';

const businessQueryClient = new QueryClient();
const USER_SCOPED_BUSINESS_KEYS = new Set([
  'businesses',
  'business',
  'my-businesses',
  'business-favorites',
  'business-admin',
  'business-admin-queue',
]);

function BusinessAuthCacheBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(userId);

  useEffect(() => {
    if (previousUserId.current !== userId) {
      queryClient.removeQueries({
        predicate: (query) =>
          USER_SCOPED_BUSINESS_KEYS.has(String(query.queryKey[0])),
      });
      previousUserId.current = userId;
    }
  }, [queryClient, userId]);

  return children;
}

export function BusinessQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={businessQueryClient}>
      <BusinessAuthCacheBoundary>
        {children}
      </BusinessAuthCacheBoundary>
    </QueryClientProvider>
  );
}