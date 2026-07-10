-- =========================================================================
-- BIOVISED — Role immutability & privilege-escalation hardening
-- Prevents authenticated users from self-assigning privileged roles via
-- profiles INSERT/UPDATE (client can only create role='user').
-- Admins may still change roles via service_role or is_admin_or_mod().
-- =========================================================================

-- Drop previous own-profile policies so we can re-create with role guards
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- INSERT: users may only create their own row with role = 'user'
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = uid
    AND (role IS NULL OR role = 'user')
  );

-- UPDATE: own row only; role column must not change unless admin/mod
-- (compares NEW.role to OLD.role via subquery)
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = uid OR is_admin_or_mod())
  WITH CHECK (
    (
      auth.uid() = uid
      AND role = (SELECT p.role FROM public.profiles p WHERE p.uid = auth.uid())
    )
    OR is_admin_or_mod()
  );

-- Admin role updates (explicit)
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE
  USING (is_admin_or_mod())
  WITH CHECK (is_admin_or_mod());

-- Defense-in-depth trigger: block non-admin role mutations
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS DISTINCT FROM 'user'
       AND NOT EXISTS (
         SELECT 1 FROM public.profiles
         WHERE uid = auth.uid()
           AND role IN ('admin', 'moderator', 'super_admin')
       )
       AND coalesce(auth.jwt()->>'role', '') <> 'service_role'
    THEN
      NEW.role := 'user';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       AND NOT EXISTS (
         SELECT 1 FROM public.profiles
         WHERE uid = auth.uid()
           AND role IN ('admin', 'moderator', 'super_admin')
       )
       AND coalesce(auth.jwt()->>'role', '') <> 'service_role'
    THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

COMMENT ON FUNCTION public.prevent_role_escalation() IS
  'Forces role=user on insert and freezes role on update unless caller is admin/mod or service_role.';
