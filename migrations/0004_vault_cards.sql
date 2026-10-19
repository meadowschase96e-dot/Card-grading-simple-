-- Saved cards for a signed-in account. Stays until that user deletes the card.

create table if not exists vault_cards (
  id text primary key,
  user_id text not null,
  saved_at bigint not null,
  payload text not null
);

create index if not exists vault_cards_user_idx on vault_cards (user_id, saved_at desc);
