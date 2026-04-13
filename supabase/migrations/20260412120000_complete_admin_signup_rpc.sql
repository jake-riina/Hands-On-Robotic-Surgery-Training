-- Admin signup: SECURITY DEFINER RPC upserts department (INSERT ON CONFLICT) and user_profiles.
-- Requires: public.departments(department_id uuid default gen_random_uuid(), program_id, department_name)
--   with UNIQUE (program_id, department_name).
-- Requires: public.user_profiles with user_id PK, FK department_id -> departments(department_id),
--   program_id not null, role type public.app_role including 'admin'.

CREATE OR REPLACE FUNCTION public.complete_admin_signup(
  p_user_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_department_name text,
  p_program_id uuid
)
RETURNS public.user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dept_id uuid;
  v_profile public.user_profiles;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized for this user' USING ERRCODE = '28000';
  END IF;

  IF p_program_id IS NULL THEN
    RAISE EXCEPTION 'program_id is required';
  END IF;

  IF p_department_name IS NULL
     OR btrim(p_department_name) = ''
     OR p_department_name NOT IN ('Cardiothoracic', 'ENT', 'Urology') THEN
    RAISE EXCEPTION 'Invalid department_name';
  END IF;

  INSERT INTO public.departments (program_id, department_name)
  VALUES (p_program_id, p_department_name)
  ON CONFLICT (program_id, department_name)
  DO UPDATE SET
    program_id = public.departments.program_id
  RETURNING department_id INTO v_dept_id;

  INSERT INTO public.user_profiles (
    user_id,
    email,
    first_name,
    last_name,
    role,
    department_id,
    program_id
  )
  VALUES (
    p_user_id,
    p_email,
    NULLIF(btrim(p_first_name), ''),
    NULLIF(btrim(p_last_name), ''),
    'admin'::public.app_role,
    v_dept_id,
    p_program_id
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, public.user_profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.user_profiles.last_name),
    role = 'admin'::public.app_role,
    department_id = EXCLUDED.department_id,
    program_id = EXCLUDED.program_id
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_admin_signup(
  uuid, text, text, text, text, uuid
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.complete_admin_signup(
  uuid, text, text, text, text, uuid
) TO authenticated;

COMMENT ON FUNCTION public.complete_admin_signup(
  uuid, text, text, text, text, uuid
) IS 'Creates department row if needed (ON CONFLICT), upserts admin user_profiles; caller must be p_user_id.';

-- RLS: RPC runs as definer and bypasses RLS for table owner. Client-side inserts into departments
-- should stay disallowed; allow SELECT for authenticated UIs if needed.

DROP POLICY IF EXISTS departments_select_authenticated ON public.departments;
CREATE POLICY departments_select_authenticated
  ON public.departments
  FOR SELECT
  TO authenticated
  USING (true);

-- Read own profile (common pattern; skip if you already have an equivalent policy under another name)
DROP POLICY IF EXISTS user_profiles_select_own ON public.user_profiles;
CREATE POLICY user_profiles_select_own
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
