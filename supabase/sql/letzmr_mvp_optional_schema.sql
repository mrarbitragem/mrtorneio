-- LETZMR MVP — colar/executar no SQL Editor do projeto de DESENVOLVIMENTO.
-- Mesmo conteúdo de supabase/migrations/20261016180000_letzmr_persistence.sql
-- Não aplicar em produção sem revisão de RLS.

CREATE TABLE IF NOT EXISTS public.letzmr_organizer_state (
  organizer_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  place jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT letzmr_organizer_state_version_positive CHECK (version >= 1)
);

CREATE TABLE IF NOT EXISTS public.letzmr_public_categories (
  category_id text PRIMARY KEY,
  tournament_id text NOT NULL,
  organizer_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  tournament_name text NOT NULL,
  category_name text NOT NULL,
  snapshot jsonb NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS letzmr_public_categories_tournament_idx
  ON public.letzmr_public_categories (tournament_id);

CREATE INDEX IF NOT EXISTS letzmr_public_categories_organizer_idx
  ON public.letzmr_public_categories (organizer_id);

ALTER TABLE public.letzmr_organizer_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letzmr_public_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "letzmr_state_select_own" ON public.letzmr_organizer_state;
CREATE POLICY "letzmr_state_select_own"
  ON public.letzmr_organizer_state FOR SELECT TO authenticated
  USING (organizer_id = auth.uid());

DROP POLICY IF EXISTS "letzmr_state_insert_own" ON public.letzmr_organizer_state;
CREATE POLICY "letzmr_state_insert_own"
  ON public.letzmr_organizer_state FOR INSERT TO authenticated
  WITH CHECK (organizer_id = auth.uid());

DROP POLICY IF EXISTS "letzmr_state_update_own" ON public.letzmr_organizer_state;
CREATE POLICY "letzmr_state_update_own"
  ON public.letzmr_organizer_state FOR UPDATE TO authenticated
  USING (organizer_id = auth.uid())
  WITH CHECK (organizer_id = auth.uid());

DROP POLICY IF EXISTS "letzmr_state_delete_own" ON public.letzmr_organizer_state;
CREATE POLICY "letzmr_state_delete_own"
  ON public.letzmr_organizer_state FOR DELETE TO authenticated
  USING (organizer_id = auth.uid());

DROP POLICY IF EXISTS "letzmr_public_select_all" ON public.letzmr_public_categories;
CREATE POLICY "letzmr_public_select_all"
  ON public.letzmr_public_categories FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "letzmr_public_insert_own" ON public.letzmr_public_categories;
CREATE POLICY "letzmr_public_insert_own"
  ON public.letzmr_public_categories FOR INSERT TO authenticated
  WITH CHECK (organizer_id = auth.uid());

DROP POLICY IF EXISTS "letzmr_public_update_own" ON public.letzmr_public_categories;
CREATE POLICY "letzmr_public_update_own"
  ON public.letzmr_public_categories FOR UPDATE TO authenticated
  USING (organizer_id = auth.uid())
  WITH CHECK (organizer_id = auth.uid());

DROP POLICY IF EXISTS "letzmr_public_delete_own" ON public.letzmr_public_categories;
CREATE POLICY "letzmr_public_delete_own"
  ON public.letzmr_public_categories FOR DELETE TO authenticated
  USING (organizer_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.letzmr_organizer_state TO authenticated;
GRANT SELECT ON public.letzmr_public_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.letzmr_public_categories TO authenticated;
