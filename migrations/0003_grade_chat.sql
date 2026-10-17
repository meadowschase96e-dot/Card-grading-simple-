-- Per-user playback of grade-chat answers. A repeat question replays the
-- stored answer instead of spending tokens. Scoped by user_id.

create table if not exists grade_chat (
  id text primary key,
  user_id text not null,
  question_key text not null,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now(),
  unique (user_id, question_key)
);

create index if not exists grade_chat_user_idx on grade_chat (user_id);
