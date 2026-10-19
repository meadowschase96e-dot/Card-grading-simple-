-- Card Grading Simple. Full app copy for the Supabase SQL editor.
-- Paste this whole file and run it once. Safe to run again. It does not drop rows.

create table if not exists _migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists "user" (
  "id" text not null primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" boolean not null,
  "image" text,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz default CURRENT_TIMESTAMP not null
);

create table if not exists "session" (
  "id" text not null primary key,
  "expiresAt" timestamptz not null,
  "token" text not null unique,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz not null,
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user" ("id") on delete cascade
);

create table if not exists "account" (
  "id" text not null primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user" ("id") on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz not null
);

create table if not exists "verification" (
  "id" text not null primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz default CURRENT_TIMESTAMP not null
);

create index if not exists "session_userId_idx" on "session" ("userId");
create index if not exists "account_userId_idx" on "account" ("userId");
create index if not exists "verification_identifier_idx" on "verification" ("identifier");

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

create table if not exists vault_cards (
  id text primary key,
  user_id text not null,
  saved_at timestamptz not null default now(),
  image text not null default '',
  back_image text not null default '',
  mat boolean not null default false,
  lane text not null default 'standard',
  model text not null default '',
  slot integer not null default 0,
  identified boolean not null default false,
  subject text not null default '',
  year text not null default '',
  set_name text not null default '',
  card_number text not null default '',
  company text not null default '',
  category text not null default 'other',
  variant text not null default '',
  overall numeric not null default 0,
  centering_text text not null default '',
  confidence numeric not null default 0,
  notes text not null default '',
  from_index boolean not null default false,
  raw_mint numeric,
  psa7 numeric,
  psa8 numeric,
  psa9 numeric,
  psa10 numeric,
  sub_centering numeric not null default 0,
  sub_corners numeric not null default 0,
  sub_edges numeric not null default 0,
  sub_surface numeric not null default 0,
  bbox_x numeric,
  bbox_y numeric,
  bbox_w numeric,
  bbox_h numeric,
  defects text[] not null default '{}',
  front_overall numeric,
  front_centering numeric,
  front_corners numeric,
  front_edges numeric,
  front_surface numeric,
  front_integrity text not null default '',
  back_overall numeric,
  back_centering numeric,
  back_corners numeric,
  back_edges numeric,
  back_surface numeric,
  back_integrity text not null default '',
  listing_channel text,
  listing_tier text,
  listing_price numeric,
  listing_submitted_at timestamptz,
  card jsonb not null default '{}'::jsonb
);
create index if not exists vault_cards_user_idx on vault_cards (user_id, saved_at desc);
create index if not exists vault_cards_category_idx on vault_cards (user_id, category);

create table if not exists vault_slots (
  user_id text not null,
  slot integer not null check (slot between 0 and 8),
  card_id text references vault_cards (id) on delete set null,
  primary key (user_id, slot)
);

create table if not exists print_lines (
  id bigserial primary key,
  kind text not null,
  company text not null,
  set_name text not null,
  sport text not null,
  year_from integer not null,
  year_to integer not null,
  unique (kind, company, set_name, sport, year_from, year_to)
);

create table if not exists grade_labels (
  min_grade numeric primary key,
  code text not null,
  name text not null
);

create table if not exists listing_channels (
  id text primary key,
  label text not null
);

create table if not exists price_tiers (
  id text primary key,
  label text not null
);

create table if not exists app_identity (
  id text primary key,
  app_name text not null,
  package_name text not null,
  admob_app_id text not null,
  admob_publisher_id text not null,
  admob_chat_unit text not null,
  motto text not null,
  tagline text not null
);

insert into print_lines (kind, company, set_name, sport, year_from, year_to) values
  ('sports', 'Bowman', 'Bowman', 'baseball', 1948, 1955),
  ('sports', 'Topps', 'Bowman', 'baseball', 1989, 2026),
  ('sports', 'Topps', 'Bowman Chrome', 'baseball', 1997, 2026),
  ('sports', 'Topps', 'Bowman Draft', 'baseball', 2006, 2026),
  ('sports', 'Topps', 'Topps', 'baseball', 1951, 2026),
  ('sports', 'Topps', 'Topps Chrome', 'baseball', 1996, 2026),
  ('sports', 'Topps', 'Topps Heritage', 'baseball', 2001, 2026),
  ('sports', 'Topps', 'Topps Update', 'baseball', 1974, 2026),
  ('sports', 'Topps', 'Stadium Club', 'baseball', 1991, 2026),
  ('sports', 'Topps', 'Topps Finest', 'baseball', 1993, 2026),
  ('sports', 'Topps', 'Allen and Ginter', 'baseball', 2006, 2026),
  ('sports', 'Topps', 'Gypsy Queen', 'baseball', 2011, 2026),
  ('sports', 'Topps', 'Topps Archives', 'baseball', 2012, 2026),
  ('sports', 'Topps', 'Opening Day', 'baseball', 1998, 2026),
  ('sports', 'Fleer', 'Fleer', 'baseball', 1981, 2007),
  ('sports', 'Fleer', 'Fleer Ultra', 'baseball', 1991, 2007),
  ('sports', 'Fleer', 'Flair', 'baseball', 1993, 2005),
  ('sports', 'Donruss', 'Donruss', 'baseball', 1981, 1998),
  ('sports', 'Panini', 'Donruss', 'baseball', 2014, 2026),
  ('sports', 'Panini', 'Donruss Optic', 'baseball', 2016, 2026),
  ('sports', 'Score', 'Score', 'baseball', 1988, 1998),
  ('sports', 'Upper Deck', 'Upper Deck', 'baseball', 1989, 2009),
  ('sports', 'Upper Deck', 'SP Authentic', 'baseball', 1994, 2009),
  ('sports', 'Leaf', 'Leaf', 'baseball', 1985, 1998),
  ('sports', 'Pinnacle', 'Pinnacle', 'baseball', 1992, 1998),
  ('sports', 'Studio', 'Studio', 'baseball', 1991, 1998),
  ('sports', 'O-Pee-Chee', 'O-Pee-Chee', 'baseball', 1965, 1994),
  ('sports', 'Topps', 'Topps', 'basketball', 1957, 2009),
  ('sports', 'Topps', 'Topps Chrome', 'basketball', 1996, 2009),
  ('sports', 'Topps', 'Topps', 'basketball', 2026, 2026),
  ('sports', 'Topps', 'Topps Chrome', 'basketball', 2026, 2026),
  ('sports', 'Fleer', 'Fleer', 'basketball', 1986, 2007),
  ('sports', 'Hoops', 'Hoops', 'basketball', 1989, 2025),
  ('sports', 'Upper Deck', 'Upper Deck', 'basketball', 1991, 2009),
  ('sports', 'SkyBox', 'SkyBox', 'basketball', 1990, 1998),
  ('sports', 'Panini', 'Prizm', 'basketball', 2012, 2025),
  ('sports', 'Panini', 'Select', 'basketball', 2012, 2025),
  ('sports', 'Panini', 'Mosaic', 'basketball', 2019, 2025),
  ('sports', 'Panini', 'National Treasures', 'basketball', 2009, 2025),
  ('sports', 'Panini', 'Donruss', 'basketball', 2014, 2025),
  ('sports', 'Panini', 'Donruss Optic', 'basketball', 2016, 2025),
  ('sports', 'Panini', 'Contenders', 'basketball', 2015, 2025),
  ('sports', 'Panini', 'Immaculate', 'basketball', 2012, 2025),
  ('sports', 'Panini', 'Hoops', 'basketball', 2010, 2025),
  ('sports', 'Topps', 'Topps', 'football', 1956, 2009),
  ('sports', 'Topps', 'Topps Chrome', 'football', 1996, 2009),
  ('sports', 'Topps', 'Topps', 'football', 2026, 2026),
  ('sports', 'Topps', 'Topps Chrome', 'football', 2026, 2026),
  ('sports', 'Fleer', 'Fleer', 'football', 1990, 2005),
  ('sports', 'Score', 'Score', 'football', 1989, 1998),
  ('sports', 'Upper Deck', 'Upper Deck', 'football', 1991, 2009),
  ('sports', 'Playoff', 'Playoff', 'football', 1992, 2004),
  ('sports', 'Sage', 'Sage', 'football', 1998, 2016),
  ('sports', 'Panini', 'Prizm', 'football', 2012, 2025),
  ('sports', 'Panini', 'Select', 'football', 2013, 2025),
  ('sports', 'Panini', 'Mosaic', 'football', 2020, 2025),
  ('sports', 'Panini', 'National Treasures', 'football', 2006, 2025),
  ('sports', 'Panini', 'Donruss', 'football', 2010, 2025),
  ('sports', 'Panini', 'Donruss Optic', 'football', 2016, 2025),
  ('sports', 'Panini', 'Contenders', 'football', 2013, 2025),
  ('sports', 'Panini', 'Immaculate', 'football', 2012, 2025),
  ('sports', 'Panini', 'Score', 'football', 2010, 2025),
  ('sports', 'Upper Deck', 'Upper Deck', 'hockey', 1990, 2026),
  ('sports', 'Upper Deck', 'Upper Deck Series One', 'hockey', 2005, 2026),
  ('sports', 'Upper Deck', 'Young Guns', 'hockey', 2005, 2026),
  ('sports', 'Upper Deck', 'SP Authentic', 'hockey', 1996, 2026),
  ('sports', 'Upper Deck', 'The Cup', 'hockey', 2005, 2026),
  ('sports', 'Upper Deck', 'O-Pee-Chee', 'hockey', 2007, 2026),
  ('sports', 'Upper Deck', 'MVP', 'hockey', 2000, 2026),
  ('sports', 'Topps', 'Topps', 'hockey', 1954, 1982),
  ('sports', 'O-Pee-Chee', 'O-Pee-Chee', 'hockey', 1968, 2005),
  ('sports', 'Parkhurst', 'Parkhurst', 'hockey', 1951, 1964),
  ('sports', 'Panini', 'Prizm', 'soccer', 2014, 2026),
  ('sports', 'Panini', 'Donruss', 'soccer', 2015, 2026),
  ('sports', 'Panini', 'Select', 'soccer', 2015, 2026),
  ('sports', 'Panini', 'Mosaic', 'soccer', 2020, 2026),
  ('sports', 'Panini', 'World Cup', 'soccer', 1970, 2026),
  ('sports', 'Topps', 'Merlin', 'soccer', 1994, 2026),
  ('sports', 'Topps', 'Match Attax', 'soccer', 2007, 2026),
  ('sports', 'Topps', 'Chrome UEFA', 'soccer', 2018, 2026),
  ('sports', 'Wizards of the Coast', 'Pokemon Base Set', 'tcg', 1999, 1999),
  ('sports', 'Wizards of the Coast', 'Pokemon Jungle', 'tcg', 1999, 1999),
  ('sports', 'Wizards of the Coast', 'Pokemon Fossil', 'tcg', 1999, 1999),
  ('sports', 'Wizards of the Coast', 'Pokemon Team Rocket', 'tcg', 2000, 2000),
  ('sports', 'Wizards of the Coast', 'Pokemon Neo Genesis', 'tcg', 2000, 2000),
  ('sports', 'Wizards of the Coast', 'Pokemon Gym Heroes', 'tcg', 2000, 2000),
  ('sports', 'The Pokemon Company', 'Pokemon EX', 'tcg', 2003, 2007),
  ('sports', 'The Pokemon Company', 'Pokemon Diamond and Pearl', 'tcg', 2007, 2009),
  ('sports', 'The Pokemon Company', 'Pokemon Platinum', 'tcg', 2009, 2010),
  ('sports', 'The Pokemon Company', 'Pokemon HeartGold SoulSilver', 'tcg', 2010, 2011),
  ('sports', 'The Pokemon Company', 'Pokemon Black and White', 'tcg', 2011, 2013),
  ('sports', 'The Pokemon Company', 'Pokemon XY', 'tcg', 2014, 2016),
  ('sports', 'The Pokemon Company', 'Pokemon Sun and Moon', 'tcg', 2017, 2019),
  ('sports', 'The Pokemon Company', 'Pokemon Sword and Shield', 'tcg', 2020, 2022),
  ('sports', 'The Pokemon Company', 'Pokemon Scarlet and Violet', 'tcg', 2023, 2026),
  ('sports', 'Wizards of the Coast', 'Magic the Gathering', 'tcg', 1993, 2026),
  ('sports', 'Wizards of the Coast', 'Magic Alpha', 'tcg', 1993, 1993),
  ('sports', 'Wizards of the Coast', 'Magic Beta', 'tcg', 1993, 1993),
  ('sports', 'Wizards of the Coast', 'Magic Unlimited', 'tcg', 1993, 1993),
  ('sports', 'Konami', 'Yu-Gi-Oh', 'tcg', 2002, 2026),
  ('sports', 'Konami', 'Legend of Blue Eyes', 'tcg', 2002, 2002),
  ('comics', 'DC', 'Action Comics', 'comic', 1938, 2026),
  ('comics', 'DC', 'Detective Comics', 'comic', 1937, 2026),
  ('comics', 'DC', 'Superman', 'comic', 1939, 2026),
  ('comics', 'DC', 'Batman', 'comic', 1940, 2026),
  ('comics', 'DC', 'Wonder Woman', 'comic', 1942, 2026),
  ('comics', 'DC', 'The Flash', 'comic', 1959, 2026),
  ('comics', 'DC', 'Justice League', 'comic', 1960, 2026),
  ('comics', 'Marvel', 'Fantastic Four', 'comic', 1961, 2026),
  ('comics', 'Marvel', 'Amazing Spider-Man', 'comic', 1963, 2026),
  ('comics', 'Marvel', 'Avengers', 'comic', 1963, 2026),
  ('comics', 'Marvel', 'X-Men', 'comic', 1963, 2026),
  ('comics', 'Marvel', 'Incredible Hulk', 'comic', 1962, 2026),
  ('comics', 'Marvel', 'Iron Man', 'comic', 1968, 2026),
  ('comics', 'Marvel', 'Thor', 'comic', 1966, 2026),
  ('comics', 'Marvel', 'Captain America', 'comic', 1968, 2026),
  ('comics', 'Marvel', 'Daredevil', 'comic', 1964, 2026),
  ('comics', 'Image', 'Spawn', 'comic', 1992, 2026),
  ('comics', 'Image', 'The Walking Dead', 'comic', 2003, 2019),
  ('comics', 'Image', 'Saga', 'comic', 2012, 2026),
  ('comics', 'Dark Horse', 'Hellboy', 'comic', 1994, 2026),
  ('comics', 'Dark Horse', 'Sin City', 'comic', 1991, 2000),
  ('comics', 'IDW', 'Teenage Mutant Ninja Turtles', 'comic', 2011, 2026),
  ('comics', 'Boom', 'Something Is Killing the Children', 'comic', 2019, 2026),
  ('comics', 'Archie', 'Archie', 'comic', 1942, 2026),
  ('games', 'Nintendo', 'Super Mario', 'game', 1985, 2026),
  ('games', 'Nintendo', 'The Legend of Zelda', 'game', 1986, 2026),
  ('games', 'Nintendo', 'Metroid', 'game', 1986, 2026),
  ('games', 'Nintendo', 'Pokemon', 'game', 1996, 2026),
  ('games', 'Nintendo', 'Animal Crossing', 'game', 2001, 2026),
  ('games', 'Nintendo', 'Splatoon', 'game', 2015, 2026),
  ('games', 'Sega', 'Sonic the Hedgehog', 'game', 1991, 2026),
  ('games', 'Capcom', 'Street Fighter', 'game', 1987, 2026),
  ('games', 'Capcom', 'Mega Man', 'game', 1987, 2026),
  ('games', 'Capcom', 'Resident Evil', 'game', 1996, 2026),
  ('games', 'Capcom', 'Monster Hunter', 'game', 2004, 2026),
  ('games', 'Konami', 'Metal Gear', 'game', 1987, 2015),
  ('games', 'Konami', 'Castlevania', 'game', 1986, 2026),
  ('games', 'Square', 'Final Fantasy', 'game', 1987, 2026),
  ('games', 'Square', 'Kingdom Hearts', 'game', 2002, 2026),
  ('games', 'Enix', 'Dragon Quest', 'game', 1986, 2026),
  ('games', 'FromSoftware', 'Dark Souls', 'game', 2011, 2018),
  ('games', 'FromSoftware', 'Elden Ring', 'game', 2022, 2026),
  ('games', 'Rockstar', 'Grand Theft Auto', 'game', 1997, 2026),
  ('games', 'Rockstar', 'Red Dead', 'game', 2004, 2026),
  ('games', 'Activision', 'Call of Duty', 'game', 2003, 2026),
  ('games', 'Bungie', 'Halo', 'game', 2001, 2026),
  ('games', 'Santa Monica', 'God of War', 'game', 2005, 2026),
  ('games', 'Naughty Dog', 'The Last of Us', 'game', 2013, 2026),
  ('games', 'Naughty Dog', 'Uncharted', 'game', 2007, 2022),
  ('games', 'Bethesda', 'The Elder Scrolls', 'game', 1994, 2026),
  ('games', 'Bethesda', 'Fallout', 'game', 1997, 2026),
  ('games', 'Mojang', 'Minecraft', 'game', 2011, 2026),
  ('games', 'EA', 'Madden', 'game', 1988, 2026),
  ('games', '2K', 'NBA 2K', 'game', 1999, 2026),
  ('games', 'Midway', 'Mortal Kombat', 'game', 1992, 2026),
  ('games', 'Nintendo', 'Tetris', 'game', 1989, 2026),
  ('games', 'Insomniac', 'Marvel''s Spider-Man', 'game', 2018, 2026),
  ('games', 'CD Projekt', 'The Witcher', 'game', 2007, 2026),
  ('games', 'CD Projekt', 'Cyberpunk 2077', 'game', 2020, 2026),
  ('systems', 'Atari', 'Atari 2600', 'system', 1977, 1992),
  ('systems', 'Mattel', 'Intellivision', 'system', 1979, 1990),
  ('systems', 'Coleco', 'ColecoVision', 'system', 1982, 1985),
  ('systems', 'Nintendo', 'NES', 'system', 1985, 1995),
  ('systems', 'Nintendo', 'SNES', 'system', 1991, 1999),
  ('systems', 'Nintendo', 'Nintendo 64', 'system', 1996, 2002),
  ('systems', 'Nintendo', 'GameCube', 'system', 2001, 2007),
  ('systems', 'Nintendo', 'Wii', 'system', 2006, 2013),
  ('systems', 'Nintendo', 'Wii U', 'system', 2012, 2017),
  ('systems', 'Nintendo', 'Switch', 'system', 2017, 2026),
  ('systems', 'Nintendo', 'Game Boy', 'system', 1989, 2003),
  ('systems', 'Nintendo', 'Game Boy Color', 'system', 1998, 2003),
  ('systems', 'Nintendo', 'Game Boy Advance', 'system', 2001, 2008),
  ('systems', 'Nintendo', 'DS', 'system', 2004, 2014),
  ('systems', 'Nintendo', '3DS', 'system', 2011, 2020),
  ('systems', 'Sega', 'Master System', 'system', 1986, 1992),
  ('systems', 'Sega', 'Genesis', 'system', 1989, 1997),
  ('systems', 'Sega', 'Sega CD', 'system', 1992, 1996),
  ('systems', 'Sega', 'Saturn', 'system', 1995, 2000),
  ('systems', 'Sega', 'Dreamcast', 'system', 1999, 2001),
  ('systems', 'Sony', 'PlayStation', 'system', 1995, 2006),
  ('systems', 'Sony', 'PlayStation 2', 'system', 2000, 2013),
  ('systems', 'Sony', 'PlayStation 3', 'system', 2006, 2017),
  ('systems', 'Sony', 'PlayStation 4', 'system', 2013, 2026),
  ('systems', 'Sony', 'PlayStation 5', 'system', 2020, 2026),
  ('systems', 'Sony', 'PSP', 'system', 2005, 2014),
  ('systems', 'Sony', 'PS Vita', 'system', 2012, 2019),
  ('systems', 'Microsoft', 'Xbox', 'system', 2001, 2009),
  ('systems', 'Microsoft', 'Xbox 360', 'system', 2005, 2016),
  ('systems', 'Microsoft', 'Xbox One', 'system', 2013, 2020),
  ('systems', 'Microsoft', 'Xbox Series', 'system', 2020, 2026),
  ('systems', 'SNK', 'Neo Geo', 'system', 1990, 1997),
  ('systems', 'NEC', 'TurboGrafx-16', 'system', 1989, 1994),
  ('systems', 'Valve', 'Steam Deck', 'system', 2022, 2026)
on conflict (kind, company, set_name, sport, year_from, year_to) do nothing;

insert into grade_labels (min_grade, code, name) values
  (10, 'GEM-MT', 'Gem Mint'),
  (9.5, 'MINT+', 'Mint+'),
  (9, 'MINT', 'Mint'),
  (8.5, 'NM-MT+', 'Near Mint-Mint+'),
  (8, 'NM-MT', 'Near Mint-Mint'),
  (7, 'NM', 'Near Mint'),
  (6, 'EX-MT', 'Excellent-Mint'),
  (5, 'EX', 'Excellent'),
  (4, 'VG-EX', 'Very Good-Excellent'),
  (3, 'VG', 'Very Good'),
  (2, 'GOOD', 'Good'),
  (1, 'FR', 'Fair'),
  (0, 'PR', 'Poor')
on conflict (min_grade) do update set code = excluded.code, name = excluded.name;

insert into listing_channels (id, label) values
  ('ebay', 'eBay'),
  ('mercari', 'Mercari'),
  ('marketplace', 'Marketplace'),
  ('posh', 'Posh')
on conflict (id) do update set label = excluded.label;

insert into price_tiers (id, label) values
  ('rawMint', 'Raw mint'),
  ('psa7', 'PSA 7'),
  ('psa8', 'PSA 8'),
  ('psa9', 'PSA 9'),
  ('psa10', 'PSA 10')
on conflict (id) do update set label = excluded.label;

insert into app_identity (id, app_name, package_name, admob_app_id, admob_publisher_id, admob_chat_unit, motto, tagline) values (
  'cgs',
  'Card Grading Simple',
  'com.donnico.gradingmadesimple',
  'ca-app-pub-7153024616679706~1734392603',
  'ca-pub-7153024616679706',
  'ca-app-pub-7153024616679706/2132480876',
  'VERITAS FIDES HONOS',
  'Scan. Grade. Vault. Powered by Don Nico'
) on conflict (id) do update set
  app_name = excluded.app_name,
  package_name = excluded.package_name,
  admob_app_id = excluded.admob_app_id,
  admob_publisher_id = excluded.admob_publisher_id,
  admob_chat_unit = excluded.admob_chat_unit,
  motto = excluded.motto,
  tagline = excluded.tagline;

insert into _migrations (name) values
  ('0001_auth.sql'),
  ('0002_card_catalog.sql'),
  ('0003_grade_chat.sql'),
  ('app-copy.sql')
on conflict (name) do nothing;

alter table card_catalog enable row level security;
alter table card_prints enable row level security;
alter table grade_chat enable row level security;
alter table vault_cards enable row level security;
alter table vault_slots enable row level security;
alter table print_lines enable row level security;
alter table grade_labels enable row level security;
alter table listing_channels enable row level security;
alter table price_tiers enable row level security;
alter table app_identity enable row level security;

drop policy if exists print_lines_read on print_lines;
create policy print_lines_read on print_lines for select to anon, authenticated using (true);
drop policy if exists grade_labels_read on grade_labels;
create policy grade_labels_read on grade_labels for select to anon, authenticated using (true);
drop policy if exists listing_channels_read on listing_channels;
create policy listing_channels_read on listing_channels for select to anon, authenticated using (true);
drop policy if exists price_tiers_read on price_tiers;
create policy price_tiers_read on price_tiers for select to anon, authenticated using (true);
drop policy if exists app_identity_read on app_identity;
create policy app_identity_read on app_identity for select to anon, authenticated using (true);
drop policy if exists card_catalog_read on card_catalog;
create policy card_catalog_read on card_catalog for select to anon, authenticated using (true);
drop policy if exists card_prints_read on card_prints;
create policy card_prints_read on card_prints for select to anon, authenticated using (true);

drop policy if exists grade_chat_own on grade_chat;
create policy grade_chat_own on grade_chat
  for all to authenticated
  using (user_id = (select auth.uid())::text)
  with check (user_id = (select auth.uid())::text);
drop policy if exists vault_cards_own on vault_cards;
create policy vault_cards_own on vault_cards
  for all to authenticated
  using (user_id = (select auth.uid())::text)
  with check (user_id = (select auth.uid())::text);
drop policy if exists vault_slots_own on vault_slots;
create policy vault_slots_own on vault_slots
  for all to authenticated
  using (user_id = (select auth.uid())::text)
  with check (user_id = (select auth.uid())::text);

grant select on print_lines, grade_labels, listing_channels, price_tiers, app_identity, card_catalog, card_prints to anon, authenticated;
grant select, insert, update, delete on grade_chat, vault_cards, vault_slots to authenticated;
grant usage, select on sequence print_lines_id_seq to anon, authenticated;

create table if not exists ad_placements (
  id text primary key,
  label text not null,
  format text not null,
  seconds integer not null,
  pages text not null,
  unit_id text not null default ''
);

create table if not exists ad_events (
  id text primary key,
  user_id text not null,
  placement_id text not null references ad_placements (id),
  unit_id text not null default '',
  shown_at timestamptz not null default now(),
  micros bigint
);

create index if not exists ad_events_user_idx on ad_events (user_id, shown_at desc);

insert into ad_placements (id, label, format, seconds, pages, unit_id) values
  ('ticker_15', 'Bottom ticker', 'banner', 15, 'Every page after the vault opens', 'ca-app-pub-7153024616679706/2132480876'),
  ('carousel_30', 'Top carousel', 'banner', 30, 'Every page. Locks on the camera until the shot', 'ca-app-pub-7153024616679706/2132480876'),
  ('vault_gate_30', 'Vault gate', 'commercial', 30, 'Before the vault', ''),
  ('standard_scan_15', 'Standard scan', 'commercial', 15, 'One-card and nine-card scan', ''),
  ('deep_front_60', 'Deep Core front', 'commercial', 60, 'Deep Core front photo', ''),
  ('deep_back_60', 'Deep Core back', 'commercial', 60, 'Deep Core back photo', ''),
  ('chat_every_4', 'Chat every 4 questions', 'banner', 0, 'Grade chat', 'ca-app-pub-7153024616679706/2132480876'),
  ('chat_box', 'Chat box', 'banner', 0, 'Grade chat composer', 'ca-app-pub-7153024616679706/2132480876')
on conflict (id) do update set
  label = excluded.label,
  format = excluded.format,
  seconds = excluded.seconds,
  pages = excluded.pages,
  unit_id = excluded.unit_id;

alter table ad_placements enable row level security;
alter table ad_events enable row level security;
drop policy if exists ad_placements_read on ad_placements;
create policy ad_placements_read on ad_placements for select to anon, authenticated using (true);
drop policy if exists ad_events_own on ad_events;
create policy ad_events_own on ad_events
  for all to authenticated
  using (user_id = (select auth.uid())::text)
  with check (user_id = (select auth.uid())::text);
grant select on ad_placements to anon, authenticated;
grant select, insert, update, delete on ad_events to authenticated;

