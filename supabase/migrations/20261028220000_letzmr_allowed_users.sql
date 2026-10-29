-- MRTorneio: lista de usuários autorizados (allowlist).
-- Só quem está aqui (active = true) consegue gravar dados de organizador.
-- A leitura pública das categorias publicadas continua aberta (anon).
--
-- Como aplicar: Supabase > SQL Editor > cole este arquivo inteiro > Run.
-- Para liberar alguém: Table Editor > letzmr_allowed_users > Insert row (e-mail em minúsculas).
-- Para bloquear: mude active para false (ou apague a linha).

CREATE TABLE IF NOT EXISTS public.letzmr_allowed_users (
  email text PRIMARY KEY,
  display_name text,
  role text NOT NULL DEFAULT 'organizer' CHECK (role IN ('admin', 'organizer')),
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT letzmr_allowed_users_email_lower CHECK (email = lower(btrim(email)))
);

-- Semente ANTES de apertar as políticas, para você não se trancar fora.
INSERT INTO public.letzmr_allowed_users (email, display_name, role, notes) VALUES
  ('mrarbitragem@gmail.com', 'Marciel Ribeiro', 'admin', 'Conta principal'),
  ('treinamento@mrarbitragem.com.br', 'Treinamento', 'organizer', 'Usuário de teste (dados fictícios)')
ON CONFLICT (email) DO NOTHING;

-- Funções auxiliares (SECURITY DEFINER evita recursão de RLS na própria tabela).
CREATE OR REPLACE FUNCTION public.letzmr_is_allowed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.letzmr_allowed_users u
    WHERE u.active
      AND u.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

CREATE OR REPLACE FUNCTION public.letzmr_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.letzmr_allowed_users u
    WHERE u.active
      AND u.role = 'admin'
      AND u.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

REVOKE ALL ON FUNCTION public.letzmr_is_allowed() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.letzmr_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.letzmr_is_allowed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.letzmr_is_admin() TO authenticated;

-- A própria tabela: cada um vê só a sua linha; admin vê e gerencia todas.
ALTER TABLE public.letzmr_allowed_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "letzmr_allowed_select" ON public.letzmr_allowed_users;
CREATE POLICY "letzmr_allowed_select"
  ON public.letzmr_allowed_users
  FOR SELECT
  TO authenticated
  USING (email = lower(coalesce(auth.jwt() ->> 'email', '')) OR public.letzmr_is_admin());

DROP POLICY IF EXISTS "letzmr_allowed_insert_admin" ON public.letzmr_allowed_users;
CREATE POLICY "letzmr_allowed_insert_admin"
  ON public.letzmr_allowed_users
  FOR INSERT
  TO authenticated
  WITH CHECK (public.letzmr_is_admin());

DROP POLICY IF EXISTS "letzmr_allowed_update_admin" ON public.letzmr_allowed_users;
CREATE POLICY "letzmr_allowed_update_admin"
  ON public.letzmr_allowed_users
  FOR UPDATE
  TO authenticated
  USING (public.letzmr_is_admin())
  WITH CHECK (public.letzmr_is_admin());

DROP POLICY IF EXISTS "letzmr_allowed_delete_admin" ON public.letzmr_allowed_users;
CREATE POLICY "letzmr_allowed_delete_admin"
  ON public.letzmr_allowed_users
  FOR DELETE
  TO authenticated
  USING (public.letzmr_is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.letzmr_allowed_users TO authenticated;

-- Estado do organizador: dono E autorizado.
DROP POLICY IF EXISTS "letzmr_state_select_own" ON public.letzmr_organizer_state;
CREATE POLICY "letzmr_state_select_own"
  ON public.letzmr_organizer_state
  FOR SELECT
  TO authenticated
  USING (organizer_id = auth.uid() AND public.letzmr_is_allowed());

DROP POLICY IF EXISTS "letzmr_state_insert_own" ON public.letzmr_organizer_state;
CREATE POLICY "letzmr_state_insert_own"
  ON public.letzmr_organizer_state
  FOR INSERT
  TO authenticated
  WITH CHECK (organizer_id = auth.uid() AND public.letzmr_is_allowed());

DROP POLICY IF EXISTS "letzmr_state_update_own" ON public.letzmr_organizer_state;
CREATE POLICY "letzmr_state_update_own"
  ON public.letzmr_organizer_state
  FOR UPDATE
  TO authenticated
  USING (organizer_id = auth.uid() AND public.letzmr_is_allowed())
  WITH CHECK (organizer_id = auth.uid() AND public.letzmr_is_allowed());

DROP POLICY IF EXISTS "letzmr_state_delete_own" ON public.letzmr_organizer_state;
CREATE POLICY "letzmr_state_delete_own"
  ON public.letzmr_organizer_state
  FOR DELETE
  TO authenticated
  USING (organizer_id = auth.uid() AND public.letzmr_is_allowed());

-- Categorias públicas: leitura aberta; escrita só do dono autorizado.
DROP POLICY IF EXISTS "letzmr_public_insert_own" ON public.letzmr_public_categories;
CREATE POLICY "letzmr_public_insert_own"
  ON public.letzmr_public_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (organizer_id = auth.uid() AND public.letzmr_is_allowed());

DROP POLICY IF EXISTS "letzmr_public_update_own" ON public.letzmr_public_categories;
CREATE POLICY "letzmr_public_update_own"
  ON public.letzmr_public_categories
  FOR UPDATE
  TO authenticated
  USING (organizer_id = auth.uid() AND public.letzmr_is_allowed())
  WITH CHECK (organizer_id = auth.uid() AND public.letzmr_is_allowed());

DROP POLICY IF EXISTS "letzmr_public_delete_own" ON public.letzmr_public_categories;
CREATE POLICY "letzmr_public_delete_own"
  ON public.letzmr_public_categories
  FOR DELETE
  TO authenticated
  USING (organizer_id = auth.uid() AND public.letzmr_is_allowed());
