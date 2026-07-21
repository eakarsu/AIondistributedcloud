CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'operator',
  country VARCHAR(100),
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  created_at TIMESTAMP DEFAULT NOW()
);
