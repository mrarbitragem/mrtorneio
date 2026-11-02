-- Regulamento do torneio: arquivos (PDF ou imagem) enviados pelo organizador.
-- Rode este script uma vez no SQL Editor do Supabase.
--
-- Leitura: o bucket é público (qualquer pessoa com o link abre o arquivo).
-- Escrita: só usuário autorizado (letzmr_allowed_users) e só dentro da própria pasta
--          (primeiro nível do caminho = id do usuário).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'letzmr-regulations',
  'letzmr-regulations',
  true,
  10485760, -- 10 MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "letzmr_regulations_insert_own" ON storage.objects;
CREATE POLICY "letzmr_regulations_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'letzmr-regulations'
    AND public.letzmr_is_allowed()
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "letzmr_regulations_update_own" ON storage.objects;
CREATE POLICY "letzmr_regulations_update_own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'letzmr-regulations'
    AND public.letzmr_is_allowed()
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'letzmr-regulations'
    AND public.letzmr_is_allowed()
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "letzmr_regulations_delete_own" ON storage.objects;
CREATE POLICY "letzmr_regulations_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'letzmr-regulations'
    AND public.letzmr_is_allowed()
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
