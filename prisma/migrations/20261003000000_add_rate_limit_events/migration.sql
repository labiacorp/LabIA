-- 10-contas: limite de tentativas e bloqueio de login no Postgres (aditiva).

-- CreateTable
CREATE TABLE "rate_limit_events" (
    "id" BIGSERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rate_limit_events_key_created_at_idx" ON "rate_limit_events"("key", "created_at");

-- Fora da API pública do Supabase, como as demais tabelas (20261002010000).
DO $$
DECLARE
  api_role text;
BEGIN
  ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.rate_limit_events FORCE ROW LEVEL SECURITY;
  REVOKE ALL PRIVILEGES ON TABLE public.rate_limit_events FROM PUBLIC;
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.rate_limit_events FROM %I', api_role);
      EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE public.rate_limit_events_id_seq FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;
