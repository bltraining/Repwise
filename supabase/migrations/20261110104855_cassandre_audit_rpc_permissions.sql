-- Différentiel à appliquer après cassandre_orchestration_whatsapp.
-- L'API privée reste disponible uniquement au service_role, y compris pour l'audit.
do $$
begin
  if to_regprocedure('public.cassandre_private_api(text,text,jsonb,jsonb)') is null then
    raise exception 'cassandre_private_api prerequisite is missing; apply the orchestration migration first';
  end if;
end;
$$;

revoke all on function public.cassandre_private_api(text,text,jsonb,jsonb)
  from public, anon, authenticated;
grant execute on function public.cassandre_private_api(text,text,jsonb,jsonb)
  to service_role;
