-- Stacked same-color tokens remain protected from capture, but no token stack
-- blocks another token from passing through or landing on a square.
do $$
declare
  v_definition text;
  v_block_pattern constant text :=
    'if\s+v_block_count\s*>=\s*2(?:\s+and\s+v_step_global\s*<>\s*all\s*\(\s*array\s*\[\s*0\s*,\s*8\s*,\s*13\s*,\s*21\s*,\s*26\s*,\s*34\s*,\s*39\s*,\s*47\s*\]\s*\))?\s+then';
  v_block_count integer;
begin
  select pg_get_functiondef(
    'public.ludo_commit_state(uuid,text,bigint,jsonb)'::regprocedure
  )
  into v_definition;

  select count(*) into v_block_count
  from regexp_matches(v_definition, v_block_pattern, 'gi');

  if v_block_count > 0 then
    v_definition := regexp_replace(
      v_definition,
      v_block_pattern,
      'if false then',
      'gi'
    );
    execute v_definition;
  end if;

  select count(*) into v_block_count
  from regexp_matches(
    v_definition,
    'if\s+v_block_count\s*>=\s*2',
    'gi'
  );

  if v_block_count <> 0 then
    raise exception
      'Expected no path-blocking guards in ludo_commit_state, found %',
      v_block_count;
  end if;
end
$$;