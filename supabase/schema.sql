-- 博多SKルーキーズ — Supabase スキーマ
--
-- 使い方:
--   Supabase のプロジェクト → 左メニュー「SQL Editor」→ New query
--   → この内容を全部貼り付けて「Run」。これだけで全テーブルが作られます。
--   （何度実行しても安全です。既にある場合は作り直しません）
--
-- 方針:
--   - 値はすべて text。アプリ側で数値変換しているため、型崩れによる不具合を防ぐ。
--   - row_id が各行の識別子。アプリの「行番号」として使う（追加しても番号がずれない）。
--   - RLS を有効にし、ポリシーを作らない ＝ 公開キーからは一切読み書きできない。
--     サーバー側のサービスロールキー経由（＝このアプリのAPI）だけがアクセスできる。

create table if not exists members (
  row_id bigint generated always as identity primary key,
  id text, name text, nickname text, jersey_number text,
  position text, joined_date text, active text, kana text
);

create table if not exists attendance (
  row_id bigint generated always as identity primary key,
  date text, member_id text, member_name text, status text, note text
);

create table if not exists batting (
  row_id bigint generated always as identity primary key,
  date text, member_id text, member_name text, opponent text,
  at_bats text, hits text, doubles text, triples text, hr text, rbi text,
  bb text, so text, hbp text, sh text, sb text, cs text
);

create table if not exists pitching (
  row_id bigint generated always as identity primary key,
  date text, member_id text, member_name text, opponent text,
  ip_outs text, hits text, runs text, er text, so text, bb text, hbp text
);

create table if not exists catching (
  row_id bigint generated always as identity primary key,
  date text, member_id text, member_name text, opponent text, sba text, cs text
);

create table if not exists fielding (
  row_id bigint generated always as identity primary key,
  date text, member_id text, member_name text, opponent text,
  po text, assists text, errors text
);

create table if not exists practices (
  row_id bigint generated always as identity primary key,
  date text, type text, place text, status text, time text, note text
);

create table if not exists participants (
  row_id bigint generated always as identity primary key,
  date text, member_id text, member_name text, note text
);

create table if not exists probables (
  row_id bigint generated always as identity primary key,
  date text, opponent text, member_id text, member_name text, note text
);

create table if not exists announcements (
  row_id bigint generated always as identity primary key,
  date text, category text, title text, body text
);

create table if not exists settings (
  row_id bigint generated always as identity primary key,
  setting_key text, value text, note text
);

create table if not exists pending (
  row_id bigint generated always as identity primary key,
  id text, kind text, date text, opponent text,
  member_id text, member_name text, data text, created_at_text text
);

create table if not exists accounts (
  row_id bigint generated always as identity primary key,
  id text, name text, name_key text, hash text, salt text,
  status text, created_at_text text, member_id text, user_id text
);

create table if not exists lineups (
  row_id bigint generated always as identity primary key,
  id text, date text, team text, batting_order text,
  member_id text, member_name text, position text
);

create table if not exists games (
  row_id bigint generated always as identity primary key,
  id text, date text, home_team text, away_team text,
  home_scores text, away_scores text, home_hits text, away_hits text,
  home_errors text, away_errors text, winner text, note text
);

create table if not exists payments (
  row_id bigint generated always as identity primary key,
  id text, date text, member_id text, member_name text, amount text, note text
);

create table if not exists news (
  row_id bigint generated always as identity primary key,
  date text, category text, title text, body text, slug text
);

create table if not exists tweets (
  row_id bigint generated always as identity primary key,
  date text, text text, url text
);

create table if not exists blog (
  row_id bigint generated always as identity primary key,
  date text, category text, title text, excerpt text, content text, slug text
);

create table if not exists subscriptions (
  row_id bigint generated always as identity primary key,
  endpoint text, p256dh text, auth text, label text, created_at_text text
);

create table if not exists evaluations (
  row_id bigint generated always as identity primary key,
  id text, member_id text, member_name text, date text,
  batting text, running text, fielding text, pitching text, teamwork text,
  comment text, created_at_text text
);

-- よく絞り込む列にインデックス（件数が増えても速いまま）
create index if not exists idx_batting_member on batting (member_id);
create index if not exists idx_pitching_member on pitching (member_id);
create index if not exists idx_attendance_date on attendance (date);
create index if not exists idx_accounts_user_id on accounts (user_id);
create index if not exists idx_accounts_member_id on accounts (member_id);
create index if not exists idx_evaluations_member on evaluations (member_id);

-- セキュリティ: RLSを有効化し、ポリシーは作らない。
-- → 公開(anon)キーでは一切読み書きできず、サーバー側のサービスロールキー経由のみ許可される。
do $$
declare t text;
begin
  foreach t in array array[
    'members','attendance','batting','pitching','catching','fielding','practices',
    'participants','probables','announcements','settings','pending','accounts',
    'lineups','games','payments','news','tweets','blog','subscriptions','evaluations'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
