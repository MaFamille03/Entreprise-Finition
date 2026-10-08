BEGIN;

DROP POLICY IF EXISTS "members all drive connections" ON public.google_drive_connections;
DROP POLICY IF EXISTS "drive connections read allowed" ON public.google_drive_connections;
DROP POLICY IF EXISTS "drive connections write allowed" ON public.google_drive_connections;

DROP TRIGGER IF EXISTS google_drive_connections_updated_at
ON public.google_drive_connections;

DROP TABLE IF EXISTS public.google_drive_connections CASCADE;

ALTER TABLE public.companies
DROP COLUMN IF EXISTS google_drive_root_folder_id;

ALTER TABLE public.documents
DROP COLUMN IF EXISTS google_drive_file_id;

ALTER TABLE public.documents
DROP COLUMN IF EXISTS google_drive_url;

ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS storage_bucket text;

ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS storage_path text;

ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS file_size bigint;

CREATE INDEX IF NOT EXISTS documents_storage_path_idx
ON public.documents(storage_bucket, storage_path);

ALTER TABLE public.documents
DROP CONSTRAINT IF EXISTS documents_storage_location_check;

ALTER TABLE public.documents
ADD CONSTRAINT documents_storage_location_check
CHECK (
    (storage_bucket IS NULL AND storage_path IS NULL)
    OR
    (storage_bucket IS NOT NULL AND storage_path IS NOT NULL)
);

COMMIT;
