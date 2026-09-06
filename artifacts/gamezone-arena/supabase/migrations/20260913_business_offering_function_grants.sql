-- Trigger helpers must not be callable as public RPCs.
revoke all on function public.business_offering_validate_report() from public, anon, authenticated;