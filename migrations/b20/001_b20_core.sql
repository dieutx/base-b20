-- B20 operational schema, portable SQL baseline.
-- Adapt types and migration wrapper to the production database engine before applying.

CREATE TABLE IF NOT EXISTS b20_orders (
  id TEXT PRIMARY KEY,
  external_reference TEXT NOT NULL,
  user_id TEXT,
  chain_id INTEGER NOT NULL,
  token_address TEXT NOT NULL,
  merchant_address TEXT NOT NULL,
  expected_amount_raw TEXT NOT NULL,
  decimals_snapshot INTEGER NOT NULL,
  memo_bytes32 TEXT NOT NULL,
  status TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS b20_onchain_payments (
  id TEXT PRIMARY KEY,
  chain_id INTEGER NOT NULL,
  token_address TEXT NOT NULL,
  transaction_hash TEXT NOT NULL,
  transfer_log_index INTEGER NOT NULL,
  memo_log_index INTEGER NOT NULL,
  block_number TEXT NOT NULL,
  block_hash TEXT NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  executor_address TEXT,
  amount_raw TEXT NOT NULL,
  memo_bytes32 TEXT NOT NULL,
  confirmations INTEGER NOT NULL,
  status TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  confirmed_at TEXT,
  raw_log_json TEXT,
  raw_receipt_json TEXT,
  UNIQUE (chain_id, transaction_hash, transfer_log_index)
);

CREATE TABLE IF NOT EXISTS b20_payment_attempts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  simulation_result TEXT NOT NULL,
  transaction_hash TEXT,
  error_code TEXT,
  error_message TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS b20_memo_refs (
  memo_bytes32 TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  token_address TEXT NOT NULL,
  namespace TEXT NOT NULL,
  canonical_payload TEXT NOT NULL,
  display_reference TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (chain_id, token_address, memo_bytes32)
);

CREATE TABLE IF NOT EXISTS b20_issuance_requests (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  chain_id INTEGER NOT NULL,
  token_address TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  amount_raw TEXT NOT NULL,
  memo_bytes32 TEXT NOT NULL,
  external_asset_reference_hash TEXT,
  status TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  tx_hash TEXT,
  transfer_log_index INTEGER,
  failure_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS b20_redemption_requests (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  chain_id INTEGER NOT NULL,
  token_address TEXT NOT NULL,
  requester_address TEXT NOT NULL,
  amount_raw TEXT NOT NULL,
  memo_bytes32 TEXT NOT NULL,
  receive_tx_hash TEXT,
  burn_tx_hash TEXT,
  status TEXT NOT NULL,
  settlement_reference_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS b20_freeze_cases (
  id TEXT PRIMARY KEY,
  chain_id INTEGER NOT NULL,
  token_address TEXT NOT NULL,
  target_address TEXT NOT NULL,
  amount_raw TEXT NOT NULL,
  case_reference_hash TEXT NOT NULL,
  sender_policy_id TEXT NOT NULL,
  status TEXT NOT NULL,
  opened_by TEXT NOT NULL,
  approved_by TEXT,
  block_tx_hash TEXT,
  burn_tx_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS b20_indexer_cursors (
  chain_id INTEGER NOT NULL,
  token_address TEXT NOT NULL,
  last_scanned_block TEXT NOT NULL,
  last_finalized_block TEXT NOT NULL,
  last_block_hash TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (chain_id, token_address)
);

CREATE TABLE IF NOT EXISTS b20_audit_events (
  id TEXT PRIMARY KEY,
  actor TEXT,
  signer_address TEXT,
  operation_type TEXT NOT NULL,
  chain_id INTEGER,
  token_address TEXT,
  request_id TEXT,
  input_hash TEXT,
  simulation_result TEXT,
  tx_hash TEXT,
  safe_proposal_id TEXT,
  before_state_json TEXT,
  after_state_json TEXT,
  success INTEGER NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL
);
