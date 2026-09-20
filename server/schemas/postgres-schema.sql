-- PostgreSQL DDL Schema for DGDash Racing System

CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(64) PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  deskripsi TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  google_sub_id VARCHAR(255),
  team_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'participant',
  is_virtual INTEGER DEFAULT 0,
  side_event_gta INTEGER DEFAULT 0,
  source_key VARCHAR(255),
  event_id VARCHAR(64),
  participant_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coupons (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS races (
  id VARCHAR(64) PRIMARY KEY,
  race_number INTEGER UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  winner_id VARCHAR(64) REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS race_registrations (
  id VARCHAR(64) PRIMARY KEY,
  race_id VARCHAR(64) NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lane VARCHAR(10) CHECK(lane IN ('A', 'B', 'C')),
  status VARCHAR(50) DEFAULT 'pending',
  finish_time DOUBLE PRECISION DEFAULT NULL,
  scrutineer_status VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(race_id, lane)
);

CREATE TABLE IF NOT EXISTS bracket_matches (
  id VARCHAR(64) PRIMARY KEY,
  event_id VARCHAR(64),
  match_number INTEGER NOT NULL,
  round_number INTEGER NOT NULL,
  user_id_1 VARCHAR(64) REFERENCES users(id),
  user_id_2 VARCHAR(64) REFERENCES users(id),
  user_id_3 VARCHAR(64) REFERENCES users(id),
  winner_id VARCHAR(64) REFERENCES users(id),
  parent_match_id VARCHAR(64) REFERENCES bracket_matches(id),
  status VARCHAR(50) DEFAULT 'pending',
  is_final INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coupon_packages (
  id VARCHAR(64) PRIMARY KEY,
  serial_number VARCHAR(100) UNIQUE NOT NULL,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_quota INTEGER NOT NULL DEFAULT 50,
  used_quota INTEGER NOT NULL DEFAULT 0,
  remaining_quota INTEGER NOT NULL DEFAULT 50,
  price_paid INTEGER DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'cash',
  package_type VARCHAR(50) DEFAULT 'standard',
  status VARCHAR(50) CHECK(status IN ('active', 'completed', 'void')) DEFAULT 'active',
  void_from_id VARCHAR(64) REFERENCES coupon_packages(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS marshal_winner_logs (
  id VARCHAR(64) PRIMARY KEY,
  package_id VARCHAR(64) NOT NULL REFERENCES coupon_packages(id),
  serial_number VARCHAR(100) NOT NULL,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id),
  lane VARCHAR(10) CHECK(lane IN ('A', 'B', 'C')) NOT NULL,
  heat_number INTEGER DEFAULT NULL,
  box_number INTEGER NOT NULL,
  status VARCHAR(50) CHECK(status IN ('active', 'undone')) DEFAULT 'active',
  ticket_id VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS next_round_tickets (
  id VARCHAR(64) PRIMARY KEY,
  ticket_number INTEGER UNIQUE NOT NULL,
  ticket_code VARCHAR(100) UNIQUE NOT NULL,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id),
  racer_ticket_index INTEGER NOT NULL DEFAULT 1,
  package_id VARCHAR(64) REFERENCES coupon_packages(id),
  serial_number VARCHAR(100) NOT NULL,
  lane VARCHAR(10) CHECK(lane IN ('A', 'B', 'C')) NOT NULL,
  source VARCHAR(50) CHECK(source IN ('marshal', 'race_director')) DEFAULT 'marshal',
  status VARCHAR(50) CHECK(status IN ('issued', 'used', 'void')) DEFAULT 'issued',
  bracket_match_id VARCHAR(64) REFERENCES bracket_matches(id),
  bracket_slot VARCHAR(50) CHECK(bracket_slot IN ('user_id_1', 'user_id_2', 'user_id_3')),
  void_reason TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bto_records (
  id VARCHAR(64) PRIMARY KEY,
  event_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_number INTEGER,
  finish_time DOUBLE PRECISION NOT NULL,
  recorded_by VARCHAR(255) DEFAULT 'panitia',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tournament_settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_users (
  id VARCHAR(64) PRIMARY KEY,
  google_id VARCHAR(255) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar TEXT,
  role VARCHAR(50) NOT NULL DEFAULT 'pending',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  approved_by VARCHAR(255) DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
