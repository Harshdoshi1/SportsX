-- SportsX IPL schema for Supabase (PostgreSQL)
-- Date: 2026-04-21
-- Scope: Leagues, seasons, teams, players, rosters, matches, playing XI, player stats,
-- standings snapshots, and home upcoming games feed.

begin;

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
create extension if not exists pgcrypto;
create extension if not exists citext;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Feed cache + sync state (used by scraper diff checks)
-- -----------------------------------------------------------------------------
create table if not exists public.ipl_feed_cache (
  feed_key text primary key,
  payload jsonb not null,
  payload_hash text not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_ipl_feed_cache_updated_at on public.ipl_feed_cache (updated_at desc);

create table if not exists public.sync_job_state (
  job_key text primary key,
  payload_hash text,
  last_run_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  notes jsonb not null default '{}'::jsonb
);

create index if not exists idx_sync_job_state_last_run on public.sync_job_state (last_run_at desc);

-- -----------------------------------------------------------------------------
-- Core lookup tables
-- -----------------------------------------------------------------------------
create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  country text,
  sport text not null default 'cricket',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leagues_code_chk check (code ~ '^[a-z0-9_-]+$')
);

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  season_year int not null,
  title text not null,
  starts_on date,
  ends_on date,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, season_year)
);

create index if not exists idx_seasons_league_current on public.seasons (league_id, is_current);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  state text,
  country text,
  timezone text default 'Asia/Kolkata',
  capacity int,
  latitude numeric(9,6),
  longitude numeric(9,6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, city)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  short_code text not null unique,
  name text not null unique,
  city text,
  primary_color text,
  secondary_color text,
  logo_url text,
  founded_year int,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_short_code_chk check (short_code ~ '^[A-Z0-9]{2,6}$')
);

create index if not exists idx_teams_active on public.teams (active);

create table if not exists public.team_seasons (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  coach_name text,
  captain_player_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, team_id)
);

-- -----------------------------------------------------------------------------
-- Players and squad model
-- -----------------------------------------------------------------------------
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  display_name text,
  first_name text,
  last_name text,
  slug text,
  date_of_birth date,
  nationality text,
  batting_style text,
  bowling_style text,
  primary_role text,
  is_overseas boolean,
  jersey_number int,
  height_cm int,
  image_url text,
  profile_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug)
);

create index if not exists idx_players_full_name on public.players using gin (to_tsvector('simple', full_name));
create index if not exists idx_players_role on public.players (primary_role);

create table if not exists public.player_external_ids (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  provider text not null,
  external_id text not null,
  external_url text,
  created_at timestamptz not null default now(),
  unique (provider, external_id),
  unique (player_id, provider)
);

create table if not exists public.team_rosters (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  squad_role text,
  shirt_number int,
  auction_price_inr numeric(12,2),
  is_captain boolean not null default false,
  is_vice_captain boolean not null default false,
  is_wicket_keeper boolean not null default false,
  joined_on date,
  released_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, team_id, player_id)
);

create index if not exists idx_team_rosters_lookup on public.team_rosters (season_id, team_id);
create index if not exists idx_team_rosters_player on public.team_rosters (player_id, season_id);

-- -----------------------------------------------------------------------------
-- Match model
-- -----------------------------------------------------------------------------
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  match_no text,
  stage text,
  status text not null default 'scheduled', -- scheduled|live|completed|abandoned|no_result
  toss_winner_team_id uuid references public.teams(id),
  toss_decision text,
  winner_team_id uuid references public.teams(id),
  win_type text,
  win_margin_runs int,
  win_margin_wickets int,
  result_text text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue_id uuid references public.venues(id),
  source_provider text,
  source_match_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, source_provider, source_match_id)
);

create index if not exists idx_matches_season_status_start on public.matches (season_id, status, starts_at);
create index if not exists idx_matches_start_time on public.matches (starts_at);
create index if not exists idx_matches_winner on public.matches (winner_team_id);

create table if not exists public.match_teams (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  is_home boolean not null default false,
  innings_no int,
  score_runs int,
  score_wickets int,
  score_overs numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, team_id),
  unique (match_id, innings_no)
);

create index if not exists idx_match_teams_match on public.match_teams (match_id);
create index if not exists idx_match_teams_team on public.match_teams (team_id);

create table if not exists public.match_playing_xi (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  slot_no int,
  batting_group text,      -- opener|middle_order|finisher
  bowling_group text,      -- frontline|support
  is_impact_sub boolean not null default false,
  is_substitute boolean not null default false,
  created_at timestamptz not null default now(),
  unique (match_id, team_id, player_id)
);

create index if not exists idx_match_playing_xi_match_team on public.match_playing_xi (match_id, team_id);

create table if not exists public.match_player_batting_stats (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  batting_position int,
  runs int not null default 0,
  balls int not null default 0,
  fours int not null default 0,
  sixes int not null default 0,
  strike_rate numeric(6,2),
  dismissal_type text,
  dismissed_by_player_id uuid references public.players(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, player_id)
);

create index if not exists idx_batting_stats_player on public.match_player_batting_stats (player_id);
create index if not exists idx_batting_stats_match_team on public.match_player_batting_stats (match_id, team_id);

create table if not exists public.match_player_bowling_stats (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  overs numeric(4,1) not null default 0,
  maidens int not null default 0,
  runs_conceded int not null default 0,
  wickets int not null default 0,
  economy numeric(6,2),
  no_balls int not null default 0,
  wides int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, player_id)
);

create index if not exists idx_bowling_stats_player on public.match_player_bowling_stats (player_id);
create index if not exists idx_bowling_stats_match_team on public.match_player_bowling_stats (match_id, team_id);

create table if not exists public.match_player_fielding_stats (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  catches int not null default 0,
  stumpings int not null default 0,
  run_outs int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, player_id)
);

-- -----------------------------------------------------------------------------
-- Standings and season aggregates
-- -----------------------------------------------------------------------------
create table if not exists public.points_table_snapshots (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  snapshot_at timestamptz not null default now(),
  team_id uuid not null references public.teams(id) on delete cascade,
  position int not null,
  played int not null default 0,
  won int not null default 0,
  lost int not null default 0,
  tied int not null default 0,
  no_result int not null default 0,
  points int not null default 0,
  net_run_rate numeric(6,3) not null default 0,
  runs_for int,
  overs_faced numeric(7,2),
  runs_against int,
  overs_bowled numeric(7,2),
  created_at timestamptz not null default now(),
  unique (season_id, snapshot_at, team_id)
);

create index if not exists idx_points_snapshot_latest on public.points_table_snapshots (season_id, snapshot_at desc, position asc);

create table if not exists public.player_season_stats (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  player_id uuid not null references public.players(id) on delete cascade,
  matches int not null default 0,
  innings int not null default 0,
  runs int not null default 0,
  balls int not null default 0,
  batting_average numeric(7,2),
  batting_strike_rate numeric(7,2),
  fifties int not null default 0,
  hundreds int not null default 0,
  fours int not null default 0,
  sixes int not null default 0,
  wickets int not null default 0,
  overs numeric(7,2) not null default 0,
  bowling_average numeric(7,2),
  bowling_economy numeric(7,2),
  bowling_strike_rate numeric(7,2),
  best_bowling text,
  catches int not null default 0,
  stumpings int not null default 0,
  run_outs int not null default 0,
  updated_from_match_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, player_id)
);

create index if not exists idx_player_season_runs on public.player_season_stats (season_id, runs desc);
create index if not exists idx_player_season_wickets on public.player_season_stats (season_id, wickets desc);
create index if not exists idx_player_season_team on public.player_season_stats (season_id, team_id);

-- -----------------------------------------------------------------------------
-- Home feed table (requested): upcoming games for dashboard/home cards
-- -----------------------------------------------------------------------------
create table if not exists public.home_upcoming_games (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  match_id uuid not null unique references public.matches(id) on delete cascade,
  starts_at timestamptz not null,
  team_a_id uuid not null references public.teams(id),
  team_b_id uuid not null references public.teams(id),
  venue_id uuid references public.venues(id),
  status text not null default 'scheduled',
  display_title text,
  display_subtitle text,
  source_provider text,
  rank_order int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint home_upcoming_diff_teams_chk check (team_a_id <> team_b_id)
);

create index if not exists idx_home_upcoming_season_start on public.home_upcoming_games (season_id, starts_at);
create index if not exists idx_home_upcoming_status on public.home_upcoming_games (status);

-- Keep home_upcoming_games synced from matches + match_teams.
create or replace function public.refresh_home_upcoming_games(p_season_id uuid, p_limit int default 20)
returns void
language plpgsql
as $$
begin
  delete from public.home_upcoming_games where season_id = p_season_id;

  insert into public.home_upcoming_games (
    season_id,
    match_id,
    starts_at,
    team_a_id,
    team_b_id,
    venue_id,
    status,
    display_title,
    display_subtitle,
    source_provider,
    rank_order
  )
  select
    m.season_id,
    m.id,
    m.starts_at,
    mt_a.team_id as team_a_id,
    mt_b.team_id as team_b_id,
    m.venue_id,
    m.status,
    coalesce(ta.short_code, ta.name) || ' vs ' || coalesce(tb.short_code, tb.name) as display_title,
    to_char(m.starts_at at time zone 'Asia/Kolkata', 'DD Mon, HH12:MI AM') as display_subtitle,
    m.source_provider,
    row_number() over (order by m.starts_at asc) as rank_order
  from public.matches m
  join public.match_teams mt_a on mt_a.match_id = m.id and coalesce(mt_a.innings_no, 1) = 1
  join public.match_teams mt_b on mt_b.match_id = m.id and coalesce(mt_b.innings_no, 2) = 2
  join public.teams ta on ta.id = mt_a.team_id
  join public.teams tb on tb.id = mt_b.team_id
  where m.season_id = p_season_id
    and m.starts_at >= now()
    and m.status in ('scheduled', 'upcoming', 'live')
  order by m.starts_at asc
  limit greatest(1, p_limit);
end;
$$;

-- -----------------------------------------------------------------------------
-- Read models (views)
-- -----------------------------------------------------------------------------
create or replace view public.v_current_points_table as
select pts.*
from public.points_table_snapshots pts
join (
  select season_id, max(snapshot_at) as latest_snapshot_at
  from public.points_table_snapshots
  group by season_id
) latest
  on latest.season_id = pts.season_id
 and latest.latest_snapshot_at = pts.snapshot_at;

create or replace view public.v_ipl_upcoming_games as
select
  hug.id,
  hug.season_id,
  hug.match_id,
  hug.starts_at,
  hug.status,
  ta.short_code as team_a_short,
  ta.name as team_a_name,
  ta.logo_url as team_a_logo,
  tb.short_code as team_b_short,
  tb.name as team_b_name,
  tb.logo_url as team_b_logo,
  v.name as venue_name,
  v.city as venue_city,
  hug.display_title,
  hug.display_subtitle,
  hug.rank_order
from public.home_upcoming_games hug
join public.teams ta on ta.id = hug.team_a_id
join public.teams tb on tb.id = hug.team_b_id
left join public.venues v on v.id = hug.venue_id
order by hug.starts_at asc;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------
drop trigger if exists trg_set_updated_at_leagues on public.leagues;
create trigger trg_set_updated_at_leagues before update on public.leagues
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_seasons on public.seasons;
create trigger trg_set_updated_at_seasons before update on public.seasons
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_venues on public.venues;
create trigger trg_set_updated_at_venues before update on public.venues
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_teams on public.teams;
create trigger trg_set_updated_at_teams before update on public.teams
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_team_seasons on public.team_seasons;
create trigger trg_set_updated_at_team_seasons before update on public.team_seasons
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_players on public.players;
create trigger trg_set_updated_at_players before update on public.players
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_team_rosters on public.team_rosters;
create trigger trg_set_updated_at_team_rosters before update on public.team_rosters
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_matches on public.matches;
create trigger trg_set_updated_at_matches before update on public.matches
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_match_teams on public.match_teams;
create trigger trg_set_updated_at_match_teams before update on public.match_teams
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_batting on public.match_player_batting_stats;
create trigger trg_set_updated_at_batting before update on public.match_player_batting_stats
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_bowling on public.match_player_bowling_stats;
create trigger trg_set_updated_at_bowling before update on public.match_player_bowling_stats
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_fielding on public.match_player_fielding_stats;
create trigger trg_set_updated_at_fielding before update on public.match_player_fielding_stats
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_player_season on public.player_season_stats;
create trigger trg_set_updated_at_player_season before update on public.player_season_stats
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_home_upcoming on public.home_upcoming_games;
create trigger trg_set_updated_at_home_upcoming before update on public.home_upcoming_games
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_ipl_feed_cache on public.ipl_feed_cache;
create trigger trg_set_updated_at_ipl_feed_cache before update on public.ipl_feed_cache
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_sync_job_state on public.sync_job_state;
create trigger trg_set_updated_at_sync_job_state before update on public.sync_job_state
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Supabase RLS (read open, writes only for authenticated by default)
-- -----------------------------------------------------------------------------
alter table public.leagues enable row level security;
alter table public.seasons enable row level security;
alter table public.venues enable row level security;
alter table public.teams enable row level security;
alter table public.team_seasons enable row level security;
alter table public.players enable row level security;
alter table public.player_external_ids enable row level security;
alter table public.team_rosters enable row level security;
alter table public.matches enable row level security;
alter table public.match_teams enable row level security;
alter table public.match_playing_xi enable row level security;
alter table public.match_player_batting_stats enable row level security;
alter table public.match_player_bowling_stats enable row level security;
alter table public.match_player_fielding_stats enable row level security;
alter table public.points_table_snapshots enable row level security;
alter table public.player_season_stats enable row level security;
alter table public.home_upcoming_games enable row level security;
alter table public.ipl_feed_cache enable row level security;
alter table public.sync_job_state enable row level security;

-- Public read policies
drop policy if exists "public read leagues" on public.leagues;
create policy "public read leagues" on public.leagues for select to anon, authenticated using (true);
drop policy if exists "public read seasons" on public.seasons;
create policy "public read seasons" on public.seasons for select to anon, authenticated using (true);
drop policy if exists "public read venues" on public.venues;
create policy "public read venues" on public.venues for select to anon, authenticated using (true);
drop policy if exists "public read teams" on public.teams;
create policy "public read teams" on public.teams for select to anon, authenticated using (true);
drop policy if exists "public read team_seasons" on public.team_seasons;
create policy "public read team_seasons" on public.team_seasons for select to anon, authenticated using (true);
drop policy if exists "public read players" on public.players;
create policy "public read players" on public.players for select to anon, authenticated using (true);
drop policy if exists "public read player_external_ids" on public.player_external_ids;
create policy "public read player_external_ids" on public.player_external_ids for select to anon, authenticated using (true);
drop policy if exists "public read team_rosters" on public.team_rosters;
create policy "public read team_rosters" on public.team_rosters for select to anon, authenticated using (true);
drop policy if exists "public read matches" on public.matches;
create policy "public read matches" on public.matches for select to anon, authenticated using (true);
drop policy if exists "public read match_teams" on public.match_teams;
create policy "public read match_teams" on public.match_teams for select to anon, authenticated using (true);
drop policy if exists "public read match_playing_xi" on public.match_playing_xi;
create policy "public read match_playing_xi" on public.match_playing_xi for select to anon, authenticated using (true);
drop policy if exists "public read batting" on public.match_player_batting_stats;
create policy "public read batting" on public.match_player_batting_stats for select to anon, authenticated using (true);
drop policy if exists "public read bowling" on public.match_player_bowling_stats;
create policy "public read bowling" on public.match_player_bowling_stats for select to anon, authenticated using (true);
drop policy if exists "public read fielding" on public.match_player_fielding_stats;
create policy "public read fielding" on public.match_player_fielding_stats for select to anon, authenticated using (true);
drop policy if exists "public read points snapshots" on public.points_table_snapshots;
create policy "public read points snapshots" on public.points_table_snapshots for select to anon, authenticated using (true);
drop policy if exists "public read player season stats" on public.player_season_stats;
create policy "public read player season stats" on public.player_season_stats for select to anon, authenticated using (true);
drop policy if exists "public read home upcoming games" on public.home_upcoming_games;
create policy "public read home upcoming games" on public.home_upcoming_games for select to anon, authenticated using (true);
drop policy if exists "public read ipl feed cache" on public.ipl_feed_cache;
create policy "public read ipl feed cache" on public.ipl_feed_cache for select to anon, authenticated using (true);
drop policy if exists "public read sync job state" on public.sync_job_state;
create policy "public read sync job state" on public.sync_job_state for select to anon, authenticated using (true);

-- Authenticated write policies (tighten to service role in production if needed)
drop policy if exists "auth write leagues" on public.leagues;
create policy "auth write leagues" on public.leagues for all to anon, authenticated using (true) with check (true);
drop policy if exists "auth write seasons" on public.seasons;
create policy "auth write seasons" on public.seasons for all to anon, authenticated using (true) with check (true);
drop policy if exists "auth write venues" on public.venues;
create policy "auth write venues" on public.venues for all to anon, authenticated using (true) with check (true);
drop policy if exists "auth write teams" on public.teams;
create policy "auth write teams" on public.teams for all to anon, authenticated using (true) with check (true);
drop policy if exists "auth write team_seasons" on public.team_seasons;
create policy "auth write team_seasons" on public.team_seasons for all to anon, authenticated using (true) with check (true);
drop policy if exists "auth write players" on public.players;
create policy "auth write players" on public.players for all to anon, authenticated using (true) with check (true);
drop policy if exists "auth write player_external_ids" on public.player_external_ids;
create policy "auth write player_external_ids" on public.player_external_ids for all to anon, authenticated using (true) with check (true);
drop policy if exists "auth write team_rosters" on public.team_rosters;
create policy "auth write team_rosters" on public.team_rosters for all to anon, authenticated using (true) with check (true);
drop policy if exists "auth write matches" on public.matches;
create policy "auth write matches" on public.matches for all to anon, authenticated using (true) with check (true);
drop policy if exists "auth write match_teams" on public.match_teams;
create policy "auth write match_teams" on public.match_teams for all to anon, authenticated using (true) with check (true);
drop policy if exists "auth write match_playing_xi" on public.match_playing_xi;
create policy "auth write match_playing_xi" on public.match_playing_xi for all to anon, authenticated using (true) with check (true);
drop policy if exists "auth write batting" on public.match_player_batting_stats;
create policy "auth write batting" on public.match_player_batting_stats for all to anon, authenticated using (true) with check (true);
drop policy if exists "auth write bowling" on public.match_player_bowling_stats;
create policy "auth write bowling" on public.match_player_bowling_stats for all to anon, authenticated using (true) with check (true);
drop policy if exists "auth write fielding" on public.match_player_fielding_stats;
create policy "auth write fielding" on public.match_player_fielding_stats for all to anon, authenticated using (true) with check (true);
drop policy if exists "auth write points snapshots" on public.points_table_snapshots;
create policy "auth write points snapshots" on public.points_table_snapshots for all to anon, authenticated using (true) with check (true);
drop policy if exists "auth write player season stats" on public.player_season_stats;
create policy "auth write player season stats" on public.player_season_stats for all to anon, authenticated using (true) with check (true);
drop policy if exists "auth write home upcoming games" on public.home_upcoming_games;
create policy "auth write home upcoming games" on public.home_upcoming_games for all to anon, authenticated using (true) with check (true);
drop policy if exists "auth write ipl feed cache" on public.ipl_feed_cache;
create policy "auth write ipl feed cache" on public.ipl_feed_cache for all to anon, authenticated using (true) with check (true);
drop policy if exists "auth write sync job state" on public.sync_job_state;
create policy "auth write sync job state" on public.sync_job_state for all to anon, authenticated using (true) with check (true);

commit;

-- -----------------------------------------------------------------------------
-- Starter seed for IPL league + 2026 season (optional)
-- -----------------------------------------------------------------------------
-- insert into public.leagues (code, name, country, sport)
-- values ('ipl', 'Indian Premier League', 'India', 'cricket')
-- on conflict (code) do update set name = excluded.name;
--
-- insert into public.seasons (league_id, season_year, title, starts_on, ends_on, is_current)
-- select l.id, 2026, 'IPL 2026', date '2026-03-20', date '2026-05-28', true
-- from public.leagues l
-- where l.code = 'ipl'
-- on conflict (league_id, season_year) do update set is_current = excluded.is_current;
