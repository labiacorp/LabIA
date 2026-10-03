-- Fecha as tabelas antigas à API pública do Supabase (PostgREST/GraphQL).
-- Criadas sem RLS, elas herdavam os grants padrão do schema public: quem tinha a
-- chave anon (que vai para o navegador) lia e gravava workspaces, flows,
-- generations e até workspace_members, sem passar pelo login.
-- Mesmo padrão de projects/provider_connections/executor_pairings: o Prisma conecta
-- como postgres (bypassrls) e aplica o escopo no servidor; nenhuma policy pública.
DO $$
DECLARE
  table_name text;
  api_role text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    '_prisma_migrations', 'assets', 'brands', 'execution_confirmations', 'flow_run_nodes',
    'flow_runs', 'flows', 'generations', 'workspace_members', 'workspaces'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', table_name);
    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', table_name, api_role);
      END IF;
    END LOOP;
  END LOOP;
END
$$;
