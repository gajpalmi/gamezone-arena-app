begin;

create or replace function public.ludo_create_room(
  p_room_code text,
  p_user_id text,
  p_player_name text,
  p_max_players integer,
  p_game_state jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.ludo_rooms%rowtype;
  v_player public.ludo_players%rowtype;
  v_max integer := greatest(2, least(4, p_max_players));
  v_first_color text;
  v_state jsonb;
  v_tokens jsonb;
  v_claim_sub text := auth.jwt() ->> 'sub';
begin
  if v_claim_sub is null or v_claim_sub <> p_user_id then
    raise exception 'LUDO_IDENTITY_MISMATCH';
  end if;

  v_first_color := case v_max when 2 then 'green' else 'green' end;
  perform pg_advisory_xact_lock(hashtext(upper(trim(p_room_code))));
  select jsonb_agg(
    jsonb_build_object('player', color, 'id', token_id, 'progress', -1)
    order by color_order, token_id
  ) into v_tokens
  from unnest(array['yellow', 'blue', 'green', 'red'])
    with ordinality as colors(color, color_order)
  cross join generate_series(0, 3) as token_id;
  v_state := jsonb_build_object(
    'tokens', v_tokens,
    'player', v_first_color,
    'playerCount', v_max,
    'diceValues', jsonb_build_object(
      'red', null, 'green', null, 'yellow', null, 'blue', null
    ),
    'rolled', false,
    'movingToken', null,
    'finishOrder', '[]'::jsonb,
    'sixCount', 0,
    'gameStarted', false,
    'revision', 0
  );

  insert into public.ludo_rooms (
    room_code, status, max_players, current_turn, dice_value,
    winner_player_id, game_state, updated_at
  ) values (
    upper(trim(p_room_code)), 'waiting', v_max, v_first_color, null,
    null,
    v_state,
    now()
  )
  returning * into v_room;

  insert into public.ludo_players (
    room_id, user_id, player_name, player_color, player_number,
    is_ready, is_connected, token_positions
  ) values (
    v_room.id, p_user_id, left(trim(p_player_name), 80), v_first_color, 1,
    true, true, array[-1, -1, -1, -1]
  )
  returning * into v_player;

  return jsonb_build_object(
    'room', to_jsonb(v_room),
    'player', to_jsonb(v_player),
    'reconnected', false
  );
end;
$$;

create or replace function public.ludo_claim_seat(
  p_room_code text,
  p_user_id text,
  p_player_name text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.ludo_rooms%rowtype;
  v_player public.ludo_players%rowtype;
  v_count integer;
  v_number integer;
  v_colors text[];
  v_color text;
  v_state jsonb;
  v_revision bigint;
  v_claim_sub text := auth.jwt() ->> 'sub';
begin
  if v_claim_sub is null or v_claim_sub <> p_user_id then
    raise exception 'LUDO_IDENTITY_MISMATCH';
  end if;

  perform pg_advisory_xact_lock(hashtext(upper(trim(p_room_code))));
  select * into v_room
  from public.ludo_rooms
  where room_code = upper(trim(p_room_code))
  for update;

  if not found then
    raise exception 'LUDO_ROOM_EXPIRED';
  end if;
  if v_room.status not in ('waiting', 'playing') then
    raise exception 'LUDO_ROOM_EXPIRED';
  end if;

  select * into v_player
  from public.ludo_players
  where room_id = v_room.id and user_id = p_user_id
  order by player_number
  limit 1;

  if found then
    update public.ludo_players
    set is_connected = true, player_name = left(trim(p_player_name), 80)
    where id = v_player.id
    returning * into v_player;
    return jsonb_build_object(
      'room', to_jsonb(v_room),
      'player', to_jsonb(v_player),
      'reconnected', true
    );
  end if;

  select count(*) into v_count
  from public.ludo_players
  where room_id = v_room.id;
  if v_count >= v_room.max_players then
    raise exception 'LUDO_ROOM_FULL';
  end if;

  v_colors := case v_room.max_players
    when 2 then array['green', 'blue']
    when 3 then array['green', 'yellow', 'red']
    else array['green', 'yellow', 'blue', 'red']
  end;

  for v_number in 1..v_room.max_players loop
    if not exists (
      select 1 from public.ludo_players
      where room_id = v_room.id and player_number = v_number
    ) then
      v_color := v_colors[v_number];
      exit;
    end if;
  end loop;
  if v_color is null then
    raise exception 'LUDO_ROOM_FULL';
  end if;

  insert into public.ludo_players (
    room_id, user_id, player_name, player_color, player_number,
    is_ready, is_connected, token_positions
  ) values (
    v_room.id, p_user_id, left(trim(p_player_name), 80), v_color, v_number,
    true, true, array[-1, -1, -1, -1]
  )
  returning * into v_player;

  v_state := coalesce(v_room.game_state, '{}'::jsonb);
  v_revision := coalesce((v_state ->> 'revision')::bigint, 0) + 1;
  v_state := jsonb_set(v_state, '{revision}', to_jsonb(v_revision), true);
  v_state := jsonb_set(v_state, '{playerCount}', to_jsonb(v_room.max_players), true);
  v_state := jsonb_set(
    v_state,
    '{gameStarted}',
    to_jsonb(v_count + 1 >= v_room.max_players),
    true
  );

  update public.ludo_rooms
  set
    status = case when v_count + 1 >= max_players then 'playing' else 'waiting' end,
    game_state = v_state,
    updated_at = now()
  where id = v_room.id
  returning * into v_room;

  return jsonb_build_object(
    'room', to_jsonb(v_room),
    'player', to_jsonb(v_player),
    'reconnected', false
  );
end;
$$;

create or replace function public.ludo_commit_state(
  p_room_id uuid,
  p_user_id text,
  p_expected_revision bigint,
  p_game_state jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.ludo_rooms%rowtype;
  v_actor text;
  v_revision bigint;
  v_next jsonb;
  v_next_turn text;
  v_changed_actor integer;
  v_changed_opponents integer;
  v_old_progress integer;
  v_new_progress integer;
  v_dice integer;
  v_extra_turn boolean;
  v_active text[];
  v_expected_turn text;
  v_candidate text;
  v_offset integer;
  v_moved_global integer;
  v_captured_global integer;
  v_opponents_at_target integer;
  v_step integer;
  v_step_global integer;
  v_block_count integer;
  v_expected_sixes integer;
  v_old_finish_count integer;
  v_new_finish_count integer;
  v_has_legal_move boolean;
  v_path_clear boolean;
  v_target_progress integer;
  v_token record;
  v_claim_sub text := auth.jwt() ->> 'sub';
begin
  if v_claim_sub is null or v_claim_sub <> p_user_id then
    raise exception 'LUDO_IDENTITY_MISMATCH';
  end if;

  select * into v_room
  from public.ludo_rooms
  where id = p_room_id
  for update;
  if not found or v_room.status not in ('waiting', 'playing') then
    raise exception 'LUDO_ROOM_EXPIRED';
  end if;

  select player_color into v_actor
  from public.ludo_players
  where room_id = p_room_id
    and user_id = p_user_id
    and is_connected = true
  order by player_number
  limit 1;
  if v_actor is null then
    raise exception 'LUDO_PLAYER_NOT_CONNECTED';
  end if;
  if v_actor <> v_room.current_turn::text then
    raise exception 'LUDO_NOT_YOUR_TURN';
  end if;

  v_revision := coalesce((v_room.game_state ->> 'revision')::bigint, 0);
  if v_revision <> p_expected_revision then
    raise exception 'LUDO_STALE_STATE';
  end if;

  v_next_turn := p_game_state ->> 'player';
  if v_next_turn not in ('red', 'green', 'yellow', 'blue') then
    raise exception 'LUDO_INVALID_TURN';
  end if;
  if coalesce((p_game_state ->> 'playerCount')::integer, 0) <> v_room.max_players then
    raise exception 'LUDO_INVALID_PLAYER_COUNT';
  end if;
  if jsonb_typeof(p_game_state -> 'tokens') <> 'array'
    or jsonb_array_length(p_game_state -> 'tokens')
      <> jsonb_array_length(v_room.game_state -> 'tokens') then
    raise exception 'LUDO_INVALID_TOKENS';
  end if;
  if jsonb_typeof(p_game_state -> 'movingToken') <> 'null' then
    raise exception 'LUDO_INVALID_MOVING_TOKEN';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_game_state -> 'tokens')
      as token(player text, id integer, progress integer)
    where token.player not in ('red', 'green', 'yellow', 'blue')
      or token.id not between 0 and 3
      or token.progress not between -1 and 57
  ) or (
    select count(*)
    from (
      select token.player, token.id
      from jsonb_to_recordset(p_game_state -> 'tokens')
        as token(player text, id integer, progress integer)
      group by token.player, token.id
    ) identities
  ) <> jsonb_array_length(p_game_state -> 'tokens') then
    raise exception 'LUDO_INVALID_TOKENS';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(v_room.game_state -> 'tokens')
      as old_token(player text, id integer, progress integer)
    full join jsonb_to_recordset(p_game_state -> 'tokens')
      as new_token(player text, id integer, progress integer)
      using (player, id)
    where old_token.id is null or new_token.id is null
  ) then
    raise exception 'LUDO_TOKEN_IDENTITY_CHANGED';
  end if;

  select
    count(*) filter (
      where old_token.player = v_actor
        and old_token.progress <> new_token.progress
    ),
    count(*) filter (
      where old_token.player <> v_actor
        and old_token.progress <> new_token.progress
    )
  into v_changed_actor, v_changed_opponents
  from jsonb_to_recordset(v_room.game_state -> 'tokens')
    as old_token(player text, id integer, progress integer)
  join jsonb_to_recordset(p_game_state -> 'tokens')
    as new_token(player text, id integer, progress integer)
    using (player, id);

  if v_changed_actor > 1 or v_changed_opponents > 1 then
    raise exception 'LUDO_ILLEGAL_TOKEN_CHANGE';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(v_room.game_state -> 'tokens')
      as old_token(player text, id integer, progress integer)
    join jsonb_to_recordset(p_game_state -> 'tokens')
      as new_token(player text, id integer, progress integer)
      using (player, id)
    where old_token.player <> v_actor
      and old_token.progress <> new_token.progress
      and new_token.progress <> -1
  ) then
    raise exception 'LUDO_ILLEGAL_CAPTURE';
  end if;

  v_dice := (v_room.game_state -> 'diceValues' ->> v_actor)::integer;
  if v_changed_actor = 1 then
    select old_token.progress, new_token.progress
    into v_old_progress, v_new_progress
    from jsonb_to_recordset(v_room.game_state -> 'tokens')
      as old_token(player text, id integer, progress integer)
    join jsonb_to_recordset(p_game_state -> 'tokens')
      as new_token(player text, id integer, progress integer)
      using (player, id)
    where old_token.player = v_actor
      and old_token.progress <> new_token.progress;
    if coalesce((v_room.game_state ->> 'rolled')::boolean, false) is not true
      or v_dice not between 1 and 6
      or not (
        (v_old_progress = -1 and v_dice = 6 and v_new_progress = 0)
        or (v_old_progress >= 0 and v_new_progress - v_old_progress = v_dice)
      ) then
      raise exception 'LUDO_ILLEGAL_MOVE';
    end if;
    if greatest(v_old_progress + 1, 0) <= least(v_new_progress, 50) then
      for v_step in greatest(v_old_progress + 1, 0)..least(v_new_progress, 50) loop
        v_step_global := (
          case v_actor
            when 'yellow' then 0 when 'blue' then 13
            when 'red' then 26 else 39
          end + v_step
        ) % 52;
        select count(*) into v_block_count
        from jsonb_to_recordset(v_room.game_state -> 'tokens')
          as token(player text, id integer, progress integer)
        where token.player <> v_actor
          and token.progress between 0 and 50
          and (
            case token.player
              when 'yellow' then 0 when 'blue' then 13
              when 'red' then 26 else 39
            end + token.progress
          ) % 52 = v_step_global;
        if v_block_count >= 2 then
          raise exception 'LUDO_OPPONENT_BLOCK';
        end if;
      end loop;
    end if;
  end if;
  if (
    coalesce((v_room.game_state ->> 'rolled')::boolean, false) is not true
    or v_dice not between 1 and 6
    or coalesce((p_game_state ->> 'rolled')::boolean, true) is not false
    or jsonb_typeof(p_game_state -> 'diceValues' -> v_actor) <> 'null'
  ) then
    raise exception 'LUDO_INVALID_DICE_LIFECYCLE';
  end if;

  if v_changed_actor = 0
    and coalesce((v_room.game_state ->> 'sixCount')::integer, 0) < 3 then
    v_has_legal_move := false;
    for v_token in
      select *
      from jsonb_to_recordset(v_room.game_state -> 'tokens')
        as token(player text, id integer, progress integer)
      where token.player = v_actor and token.progress < 57
    loop
      v_target_progress := case
        when v_token.progress = -1 and v_dice = 6 then 0
        when v_token.progress >= 0 and v_token.progress + v_dice <= 57
          then v_token.progress + v_dice
        else null
      end;
      if v_target_progress is not null then
        v_path_clear := true;
        if v_target_progress <= 50 then
          for v_step in greatest(v_token.progress + 1, 0)..v_target_progress loop
            v_step_global := (
              case v_actor
                when 'yellow' then 0 when 'blue' then 13
                when 'red' then 26 else 39
              end + v_step
            ) % 52;
            select count(*) into v_block_count
            from jsonb_to_recordset(v_room.game_state -> 'tokens')
              as blocker(player text, id integer, progress integer)
            where blocker.player <> v_actor
              and blocker.progress between 0 and 50
              and (
                case blocker.player
                  when 'yellow' then 0 when 'blue' then 13
                  when 'red' then 26 else 39
                end + blocker.progress
              ) % 52 = v_step_global;
            if v_block_count >= 2 then
              v_path_clear := false;
              exit;
            end if;
          end loop;
        end if;
        if v_path_clear then
          v_has_legal_move := true;
          exit;
        end if;
      end if;
    end loop;
    if v_has_legal_move then
      raise exception 'LUDO_ILLEGAL_PASS';
    end if;
  end if;

  if v_changed_opponents = 1 then
    if v_changed_actor <> 1 or v_new_progress not between 0 and 50 then
      raise exception 'LUDO_ILLEGAL_CAPTURE';
    end if;
    select
      (case v_actor
        when 'yellow' then 0 when 'blue' then 13
        when 'red' then 26 else 39
      end + v_new_progress) % 52
    into v_moved_global;
    select
      (case old_token.player
        when 'yellow' then 0 when 'blue' then 13
        when 'red' then 26 else 39
      end + old_token.progress) % 52
    into v_captured_global
    from jsonb_to_recordset(v_room.game_state -> 'tokens')
      as old_token(player text, id integer, progress integer)
    join jsonb_to_recordset(p_game_state -> 'tokens')
      as new_token(player text, id integer, progress integer)
      using (player, id)
    where old_token.player <> v_actor
      and old_token.progress <> new_token.progress;
    select count(*) into v_opponents_at_target
    from jsonb_to_recordset(v_room.game_state -> 'tokens')
      as token(player text, id integer, progress integer)
    where token.player <> v_actor
      and token.progress between 0 and 50
      and (
        case token.player
          when 'yellow' then 0 when 'blue' then 13
          when 'red' then 26 else 39
        end + token.progress
      ) % 52 = v_moved_global;
    if v_moved_global <> v_captured_global
      or v_moved_global = any(array[0, 8, 13, 21, 26, 34, 39, 47])
      or v_opponents_at_target <> 1 then
      raise exception 'LUDO_ILLEGAL_CAPTURE';
    end if;
  end if;

  v_extra_turn :=
    (v_changed_actor = 1 and v_dice = 6)
    or v_changed_opponents = 1
    or (v_changed_actor = 1 and v_new_progress = 57);
  if v_extra_turn then
    v_expected_turn := v_actor;
  else
    v_active := case v_room.max_players
      when 2 then array['green', 'blue']
      when 3 then array['green', 'yellow', 'red']
      else array['green', 'yellow', 'blue', 'red']
    end;
    for v_offset in 1..array_length(v_active, 1) loop
      v_candidate := v_active[
        ((array_position(v_active, v_actor) - 1 + v_offset)
          % array_length(v_active, 1)) + 1
      ];
      if not (coalesce(p_game_state -> 'finishOrder', '[]'::jsonb) ? v_candidate) then
        v_expected_turn := v_candidate;
        exit;
      end if;
    end loop;
  end if;
  if v_next_turn <> v_expected_turn then
    raise exception 'LUDO_ILLEGAL_NEXT_TURN';
  end if;
  v_expected_sixes := case
    when v_next_turn = v_actor and v_changed_actor = 1 and v_dice = 6
    then coalesce((v_room.game_state ->> 'sixCount')::integer, 0)
    else 0
  end;
  if coalesce((p_game_state ->> 'sixCount')::integer, -1) <> v_expected_sixes then
    raise exception 'LUDO_INVALID_SIX_COUNT';
  end if;

  v_old_finish_count :=
    jsonb_array_length(coalesce(v_room.game_state -> 'finishOrder', '[]'::jsonb));
  v_new_finish_count :=
    jsonb_array_length(coalesce(p_game_state -> 'finishOrder', '[]'::jsonb));
  if v_new_finish_count < v_old_finish_count
    or v_new_finish_count > v_old_finish_count + 1
    or (
      select count(distinct finished.player)
      from jsonb_array_elements_text(coalesce(p_game_state -> 'finishOrder', '[]'::jsonb))
        as finished(player)
    ) <> v_new_finish_count
    or exists (
      select 1
      from generate_series(0, v_old_finish_count - 1) as position
      where v_room.game_state -> 'finishOrder' ->> position
        is distinct from p_game_state -> 'finishOrder' ->> position
    )
    or (
      v_new_finish_count = v_old_finish_count + 1
      and p_game_state -> 'finishOrder' ->> v_old_finish_count <> v_actor
    ) then
    raise exception 'LUDO_INVALID_FINISH_ORDER';
  end if;
  if exists (
    select 1
    from jsonb_array_elements_text(coalesce(p_game_state -> 'finishOrder', '[]'::jsonb))
      as finished(player)
    where finished.player not in ('red', 'green', 'yellow', 'blue')
      or (
        select count(*)
        from jsonb_to_recordset(p_game_state -> 'tokens')
          as token(player text, id integer, progress integer)
        where token.player = finished.player and token.progress = 57
      ) <> 4
  ) then
    raise exception 'LUDO_INVALID_FINISH_ORDER';
  end if;

  v_next := jsonb_set(
    coalesce(p_game_state, '{}'::jsonb),
    '{revision}',
    to_jsonb(v_revision + 1),
    true
  );
  v_next := jsonb_set(v_next, '{movingToken}', 'null'::jsonb, true);
  update public.ludo_rooms
  set
    current_turn = v_next_turn,
    dice_value = case
      when jsonb_typeof(v_next -> 'diceValues' -> v_next_turn) = 'number'
      then (v_next -> 'diceValues' ->> v_next_turn)::integer
      else null
    end,
    game_state = v_next,
    updated_at = now()
  where id = p_room_id
  returning * into v_room;

  return to_jsonb(v_room);
end;
$$;

create or replace function public.ludo_roll_dice(
  p_room_id uuid,
  p_user_id text,
  p_expected_revision bigint
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.ludo_rooms%rowtype;
  v_actor text;
  v_claim_sub text := auth.jwt() ->> 'sub';
  v_revision bigint;
  v_roll integer;
  v_sixes integer;
  v_state jsonb;
begin
  if v_claim_sub is null or v_claim_sub <> p_user_id then
    raise exception 'LUDO_IDENTITY_MISMATCH';
  end if;

  select * into v_room
  from public.ludo_rooms
  where id = p_room_id
  for update;
  if not found or v_room.status <> 'playing' then
    raise exception 'LUDO_ROOM_NOT_READY';
  end if;

  select player_color into v_actor
  from public.ludo_players
  where room_id = p_room_id
    and user_id = p_user_id
    and is_connected = true
  order by player_number
  limit 1;
  if v_actor is null or v_actor <> v_room.current_turn::text then
    raise exception 'LUDO_NOT_YOUR_TURN';
  end if;

  v_revision := coalesce((v_room.game_state ->> 'revision')::bigint, 0);
  if v_revision <> p_expected_revision then
    raise exception 'LUDO_STALE_STATE';
  end if;
  if coalesce((v_room.game_state ->> 'rolled')::boolean, false)
    or nullif(v_room.game_state ->> 'movingToken', '') is not null then
    raise exception 'LUDO_DICE_ALREADY_ROLLED';
  end if;

  v_roll := floor(random() * 6 + 1)::integer;
  v_sixes := case
    when v_roll = 6 then coalesce((v_room.game_state ->> 'sixCount')::integer, 0) + 1
    else 0
  end;
  v_state := jsonb_set(v_room.game_state, array['diceValues', v_actor], to_jsonb(v_roll), true);
  v_state := jsonb_set(v_state, '{rolled}', 'true'::jsonb, true);
  v_state := jsonb_set(v_state, '{sixCount}', to_jsonb(v_sixes), true);
  v_state := jsonb_set(v_state, '{gameStarted}', 'true'::jsonb, true);
  v_state := jsonb_set(v_state, '{revision}', to_jsonb(v_revision + 1), true);

  update public.ludo_rooms
  set dice_value = v_roll, game_state = v_state, updated_at = now()
  where id = p_room_id
  returning * into v_room;

  return jsonb_build_object('room', to_jsonb(v_room), 'dice', v_roll);
end;
$$;

create or replace function public.ludo_is_room_participant(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ludo_players
    where room_id = p_room_id
      and user_id = auth.jwt() ->> 'sub'
  );
$$;

alter table public.ludo_rooms enable row level security;
alter table public.ludo_players enable row level security;

drop policy if exists ludo_rooms_participant_read on public.ludo_rooms;
create policy ludo_rooms_participant_read
on public.ludo_rooms for select
to authenticated
using (public.ludo_is_room_participant(id));

drop policy if exists ludo_players_participant_read on public.ludo_players;
create policy ludo_players_participant_read
on public.ludo_players for select
to authenticated
using (public.ludo_is_room_participant(room_id));

drop policy if exists ludo_players_self_update on public.ludo_players;
create policy ludo_players_self_update
on public.ludo_players for update
to authenticated
using (user_id = auth.jwt() ->> 'sub')
with check (user_id = auth.jwt() ->> 'sub');

revoke insert, update, delete on public.ludo_rooms from anon, authenticated;
revoke insert, delete on public.ludo_players from anon, authenticated;
grant select on public.ludo_rooms, public.ludo_players to authenticated;
grant update (player_name, is_ready, is_connected, token_positions)
  on public.ludo_players to authenticated;

revoke all on function public.ludo_create_room(text, text, text, integer, jsonb) from public;
revoke all on function public.ludo_claim_seat(text, text, text) from public;
revoke all on function public.ludo_commit_state(uuid, text, bigint, jsonb) from public;
revoke all on function public.ludo_roll_dice(uuid, text, bigint) from public;
revoke all on function public.ludo_is_room_participant(uuid) from public;
grant execute on function public.ludo_create_room(text, text, text, integer, jsonb) to authenticated;
grant execute on function public.ludo_claim_seat(text, text, text) to authenticated;
grant execute on function public.ludo_commit_state(uuid, text, bigint, jsonb) to authenticated;
grant execute on function public.ludo_roll_dice(uuid, text, bigint) to authenticated;
grant execute on function public.ludo_is_room_participant(uuid) to authenticated;

commit;