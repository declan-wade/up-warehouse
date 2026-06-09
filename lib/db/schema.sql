-- Up Bank data warehouse schema (DuckDB).
-- Idempotent: safe to run on every connection. Money is stored as exact integer
-- base units (cents) plus a derived DOUBLE for convenient analytics. The complete
-- API payload for every resource is retained in a `raw` JSON column.

CREATE TABLE IF NOT EXISTS accounts (
  id                          VARCHAR PRIMARY KEY,
  display_name                VARCHAR,
  account_type                VARCHAR,      -- SAVER | TRANSACTIONAL | HOME_LOAN
  ownership_type              VARCHAR,      -- INDIVIDUAL | JOINT
  balance_value_in_base_units BIGINT,
  balance_currency_code       VARCHAR,
  balance                     DOUBLE,       -- derived dollars
  created_at                  TIMESTAMPTZ,
  raw                         JSON,
  synced_at                   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS categories (
  id        VARCHAR PRIMARY KEY,
  name      VARCHAR,
  parent_id VARCHAR,
  raw       JSON
);

CREATE TABLE IF NOT EXISTS tags (
  id VARCHAR PRIMARY KEY              -- the tag string is its own id
);

CREATE TABLE IF NOT EXISTS transactions (
  id                              VARCHAR PRIMARY KEY,
  account_id                      VARCHAR,
  status                          VARCHAR,   -- HELD | SETTLED
  raw_text                        VARCHAR,
  description                     VARCHAR,
  message                         VARCHAR,
  is_categorizable                BOOLEAN,
  hold_value_in_base_units        BIGINT,
  hold_currency_code              VARCHAR,
  round_up_value_in_base_units    BIGINT,
  round_up_boost_in_base_units    BIGINT,
  cashback_description            VARCHAR,
  cashback_value_in_base_units    BIGINT,
  amount_value_in_base_units      BIGINT,
  amount_currency_code            VARCHAR,
  amount                          DOUBLE,    -- derived dollars (negative = debit)
  foreign_amount_value_in_base_units BIGINT,
  foreign_amount_currency_code    VARCHAR,
  card_purchase_method            VARCHAR,
  card_number_suffix              VARCHAR,
  settled_at                      TIMESTAMPTZ,
  created_at                      TIMESTAMPTZ,
  transaction_type                VARCHAR,
  note                            VARCHAR,
  category_id                     VARCHAR,   -- child category
  parent_category_id              VARCHAR,
  transfer_account_id             VARCHAR,
  deep_link_url                   VARCHAR,
  raw                             JSON,
  synced_at                       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tx_created_at ON transactions (created_at);
CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions (category_id);
CREATE INDEX IF NOT EXISTS idx_tx_parent_category ON transactions (parent_category_id);

CREATE TABLE IF NOT EXISTS transaction_tags (
  transaction_id VARCHAR,
  tag_id         VARCHAR,
  PRIMARY KEY (transaction_id, tag_id)
);

CREATE TABLE IF NOT EXISTS attachments (
  id                  VARCHAR PRIMARY KEY,
  transaction_id      VARCHAR,
  created_at          TIMESTAMPTZ,
  file_content_type   VARCHAR,
  file_url            VARCHAR,
  file_url_expires_at  TIMESTAMPTZ,
  raw                 JSON
);

-- One row per sync invocation; powers the UI's "last synced" indicator.
CREATE SEQUENCE IF NOT EXISTS seq_sync_runs START 1;
CREATE TABLE IF NOT EXISTS sync_runs (
  id                    BIGINT PRIMARY KEY DEFAULT nextval('seq_sync_runs'),
  kind                  VARCHAR,   -- full | incremental
  status                VARCHAR,   -- running | success | error
  started_at            TIMESTAMPTZ,
  finished_at           TIMESTAMPTZ,
  accounts_count        BIGINT,
  categories_count      BIGINT,
  tags_count            BIGINT,
  transactions_upserted BIGINT,
  attachments_count     BIGINT,
  error_message         VARCHAR
);
