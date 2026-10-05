CREATE TABLE public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  uses integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.access_codes TO service_role;
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;