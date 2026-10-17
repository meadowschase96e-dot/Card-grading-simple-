-- Shared card catalog. The reader replays a stored identification so vision
-- tokens are not spent again. Market and PSA prices stay a live text call.
-- Global reference data, not per-user photos. Prints are hashes, not images.

create table if not exists card_catalog (
  id text primary key,
  identity_key text not null unique,
  subject text not null,
  year text not null default '',
  set_name text not null default '',
  card_number text not null default '',
  company text not null default '',
  category text not null default 'other',
  playback text not null,
  hits integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists card_prints (
  print text primary key,
  catalog_id text not null references card_catalog (id) on delete cascade
);

create index if not exists card_prints_catalog_idx on card_prints (catalog_id);
