const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'telecom_residency',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function seed() {
  console.log('Creating tables...');
  await pool.query(`
    DROP TABLE IF EXISTS compliance_reports CASCADE;
    DROP TABLE IF EXISTS customer_intents CASCADE;
    DROP TABLE IF EXISTS ai_support_responses CASCADE;
    DROP TABLE IF EXISTS sentiment_analyses CASCADE;
    DROP TABLE IF EXISTS translations CASCADE;
    DROP TABLE IF EXISTS audit_logs CASCADE;
    DROP TABLE IF EXISTS compliance_rules CASCADE;
    DROP TABLE IF EXISTS roaming_agreements CASCADE;
    DROP TABLE IF EXISTS sim_cards CASCADE;
    DROP TABLE IF EXISTS network_nodes CASCADE;
    DROP TABLE IF EXISTS tickets CASCADE;
    DROP TABLE IF EXISTS billing CASCADE;
    DROP TABLE IF EXISTS data_zones CASCADE;
    DROP TABLE IF EXISTS customers CASCADE;
    DROP TABLE IF EXISTS users CASCADE;

    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'operator',
      country VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE customers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      country VARCHAR(100) NOT NULL,
      data_zone VARCHAR(100),
      plan_type VARCHAR(100),
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE data_zones (
      id SERIAL PRIMARY KEY,
      zone_name VARCHAR(255) NOT NULL,
      country VARCHAR(100) NOT NULL,
      region VARCHAR(100),
      data_center VARCHAR(255),
      encryption_standard VARCHAR(100),
      compliance_level VARCHAR(50),
      max_storage_tb DECIMAL(10,2),
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE billing (
      id SERIAL PRIMARY KEY,
      customer_name VARCHAR(255) NOT NULL,
      country VARCHAR(100) NOT NULL,
      invoice_number VARCHAR(100),
      amount DECIMAL(12,2),
      currency VARCHAR(10),
      billing_period VARCHAR(50),
      payment_status VARCHAR(50) DEFAULT 'pending',
      payment_method VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE tickets (
      id SERIAL PRIMARY KEY,
      customer_name VARCHAR(255) NOT NULL,
      country VARCHAR(100) NOT NULL,
      subject VARCHAR(500),
      description TEXT,
      priority VARCHAR(50),
      category VARCHAR(100),
      status VARCHAR(50) DEFAULT 'open',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE network_nodes (
      id SERIAL PRIMARY KEY,
      node_name VARCHAR(255) NOT NULL,
      country VARCHAR(100) NOT NULL,
      city VARCHAR(100),
      node_type VARCHAR(100),
      ip_address VARCHAR(50),
      capacity_gbps DECIMAL(10,2),
      latency_ms DECIMAL(10,2),
      status VARCHAR(50) DEFAULT 'online',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE sim_cards (
      id SERIAL PRIMARY KEY,
      iccid VARCHAR(50),
      msisdn VARCHAR(50),
      imsi VARCHAR(50),
      customer_name VARCHAR(255),
      country VARCHAR(100) NOT NULL,
      sim_type VARCHAR(50),
      network_type VARCHAR(50),
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE roaming_agreements (
      id SERIAL PRIMARY KEY,
      partner_name VARCHAR(255) NOT NULL,
      home_country VARCHAR(100) NOT NULL,
      roaming_country VARCHAR(100) NOT NULL,
      agreement_type VARCHAR(100),
      data_rate_per_mb DECIMAL(10,4),
      voice_rate_per_min DECIMAL(10,4),
      validity_start DATE,
      validity_end DATE,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE compliance_rules (
      id SERIAL PRIMARY KEY,
      rule_name VARCHAR(255) NOT NULL,
      country VARCHAR(100) NOT NULL,
      regulation VARCHAR(255),
      description TEXT,
      enforcement_date DATE,
      penalty_amount DECIMAL(12,2),
      currency VARCHAR(10),
      severity VARCHAR(50),
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE audit_logs (
      id SERIAL PRIMARY KEY,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(100),
      entity_id VARCHAR(100),
      user_email VARCHAR(255),
      country VARCHAR(100),
      ip_address VARCHAR(50),
      details TEXT,
      risk_level VARCHAR(50) DEFAULT 'low',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE translations (
      id SERIAL PRIMARY KEY,
      source_text TEXT,
      translated_text TEXT,
      source_language VARCHAR(50),
      target_language VARCHAR(50),
      country VARCHAR(100),
      customer_name VARCHAR(255),
      ai_model VARCHAR(100),
      status VARCHAR(50) DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE sentiment_analyses (
      id SERIAL PRIMARY KEY,
      customer_message TEXT,
      customer_name VARCHAR(255),
      country VARCHAR(100),
      channel VARCHAR(50),
      sentiment VARCHAR(50),
      confidence DECIMAL(5,4),
      key_topics TEXT,
      urgency VARCHAR(50),
      ai_summary TEXT,
      ai_model VARCHAR(100),
      status VARCHAR(50) DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE ai_support_responses (
      id SERIAL PRIMARY KEY,
      customer_query TEXT,
      customer_name VARCHAR(255),
      country VARCHAR(100),
      category VARCHAR(100),
      language VARCHAR(50),
      ai_response TEXT,
      suggested_actions TEXT,
      escalation_needed BOOLEAN DEFAULT false,
      estimated_resolution VARCHAR(50),
      ai_model VARCHAR(100),
      status VARCHAR(50) DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE customer_intents (
      id SERIAL PRIMARY KEY,
      customer_message TEXT,
      customer_name VARCHAR(255),
      country VARCHAR(100),
      channel VARCHAR(50),
      primary_intent VARCHAR(100),
      confidence DECIMAL(5,4),
      secondary_intents TEXT,
      entities TEXT,
      recommended_department VARCHAR(100),
      priority VARCHAR(50),
      ai_model VARCHAR(100),
      status VARCHAR(50) DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE compliance_reports (
      id SERIAL PRIMARY KEY,
      country VARCHAR(100),
      report_type VARCHAR(100),
      scope TEXT,
      period VARCHAR(100),
      title VARCHAR(500),
      executive_summary TEXT,
      findings TEXT,
      risk_score INTEGER,
      compliance_status VARCHAR(50),
      action_items TEXT,
      ai_model VARCHAR(100),
      status VARCHAR(50) DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('Seeding users...');
  const hash = await bcrypt.hash('password123', 10);
  await pool.query(`
    INSERT INTO users (name, email, password_hash, role, country) VALUES
    ('Admin User', 'admin@telecom.com', $1, 'admin', 'Global'),
    ('DE Operator', 'operator@de.telecom.com', $1, 'operator', 'Germany'),
    ('FR Operator', 'operator@fr.telecom.com', $1, 'operator', 'France'),
    ('JP Operator', 'operator@jp.telecom.com', $1, 'operator', 'Japan'),
    ('BR Operator', 'operator@br.telecom.com', $1, 'operator', 'Brazil')
  `, [hash]);

  console.log('Seeding customers...');
  await pool.query(`
    INSERT INTO customers (name, email, phone, country, data_zone, plan_type, status) VALUES
    ('Hans Mueller', 'hans@example.de', '+49-30-12345', 'Germany', 'EU-West', 'Enterprise', 'active'),
    ('Marie Dupont', 'marie@example.fr', '+33-1-23456', 'France', 'EU-West', 'Business', 'active'),
    ('Yuki Tanaka', 'yuki@example.jp', '+81-3-12345', 'Japan', 'APAC-East', 'Premium', 'active'),
    ('Carlos Silva', 'carlos@example.br', '+55-11-12345', 'Brazil', 'LATAM-South', 'Business', 'active'),
    ('Priya Sharma', 'priya@example.in', '+91-11-12345', 'India', 'APAC-South', 'Enterprise', 'active'),
    ('Li Wei', 'li.wei@example.cn', '+86-10-12345', 'China', 'APAC-East', 'Enterprise', 'active'),
    ('Ahmed Hassan', 'ahmed@example.ae', '+971-2-12345', 'UAE', 'MEA-Gulf', 'Premium', 'active'),
    ('Sofia Garcia', 'sofia@example.mx', '+52-55-12345', 'Mexico', 'LATAM-North', 'Standard', 'active'),
    ('James Wilson', 'james@example.au', '+61-2-12345', 'Australia', 'APAC-South', 'Business', 'active'),
    ('Anna Kowalski', 'anna@example.pl', '+48-22-12345', 'Poland', 'EU-East', 'Standard', 'active'),
    ('Kim Min-jun', 'minjun@example.kr', '+82-2-12345', 'South Korea', 'APAC-East', 'Premium', 'active'),
    ('Olga Petrov', 'olga@example.ru', '+7-495-12345', 'Russia', 'EU-East', 'Business', 'suspended'),
    ('Fatima Al-Said', 'fatima@example.sa', '+966-1-12345', 'Saudi Arabia', 'MEA-Gulf', 'Enterprise', 'active'),
    ('Lars Eriksson', 'lars@example.se', '+46-8-12345', 'Sweden', 'EU-North', 'Standard', 'active'),
    ('Thabo Molefe', 'thabo@example.za', '+27-11-12345', 'South Africa', 'MEA-South', 'Business', 'active'),
    ('Elena Rossi', 'elena@example.it', '+39-6-12345', 'Italy', 'EU-South', 'Premium', 'active')
  `);

  console.log('Seeding data zones...');
  await pool.query(`
    INSERT INTO data_zones (zone_name, country, region, data_center, encryption_standard, compliance_level, max_storage_tb, status) VALUES
    ('EU-West-Primary', 'Germany', 'EU-West', 'Frankfurt DC-1', 'AES-256-GCM', 'GDPR-Full', 500.00, 'active'),
    ('EU-West-Secondary', 'France', 'EU-West', 'Paris DC-2', 'AES-256-GCM', 'GDPR-Full', 350.00, 'active'),
    ('APAC-East-Primary', 'Japan', 'APAC-East', 'Tokyo DC-1', 'AES-256-CBC', 'APPI-Full', 400.00, 'active'),
    ('LATAM-South-Primary', 'Brazil', 'LATAM-South', 'Sao Paulo DC-1', 'AES-256-GCM', 'LGPD-Full', 300.00, 'active'),
    ('APAC-South-Primary', 'India', 'APAC-South', 'Mumbai DC-1', 'AES-256-GCM', 'DPDP-Full', 450.00, 'active'),
    ('APAC-East-Secondary', 'China', 'APAC-East', 'Shanghai DC-1', 'SM4-GCM', 'PIPL-Full', 600.00, 'active'),
    ('MEA-Gulf-Primary', 'UAE', 'MEA-Gulf', 'Dubai DC-1', 'AES-256-GCM', 'PDPL-Full', 200.00, 'active'),
    ('LATAM-North-Primary', 'Mexico', 'LATAM-North', 'Mexico City DC-1', 'AES-256-CBC', 'LFPDPPP-Full', 250.00, 'active'),
    ('APAC-South-Secondary', 'Australia', 'APAC-South', 'Sydney DC-1', 'AES-256-GCM', 'APPs-Full', 300.00, 'active'),
    ('EU-East-Primary', 'Poland', 'EU-East', 'Warsaw DC-1', 'AES-256-GCM', 'GDPR-Full', 200.00, 'active'),
    ('APAC-East-Tertiary', 'South Korea', 'APAC-East', 'Seoul DC-1', 'AES-256-GCM', 'PIPA-Full', 350.00, 'active'),
    ('MEA-Gulf-Secondary', 'Saudi Arabia', 'MEA-Gulf', 'Riyadh DC-1', 'AES-256-GCM', 'PDPL-Full', 250.00, 'active'),
    ('EU-North-Primary', 'Sweden', 'EU-North', 'Stockholm DC-1', 'AES-256-GCM', 'GDPR-Full', 180.00, 'active'),
    ('MEA-South-Primary', 'South Africa', 'MEA-South', 'Johannesburg DC-1', 'AES-256-CBC', 'POPIA-Full', 150.00, 'active'),
    ('EU-South-Primary', 'Italy', 'EU-South', 'Milan DC-1', 'AES-256-GCM', 'GDPR-Full', 280.00, 'active'),
    ('EU-East-DR', 'Poland', 'EU-East', 'Krakow DC-DR', 'AES-256-GCM', 'GDPR-Full', 100.00, 'standby')
  `);

  console.log('Seeding billing...');
  await pool.query(`
    INSERT INTO billing (customer_name, country, invoice_number, amount, currency, billing_period, payment_status, payment_method) VALUES
    ('Hans Mueller', 'Germany', 'INV-DE-2024-001', 1250.00, 'EUR', '2024-01', 'paid', 'SEPA Direct Debit'),
    ('Marie Dupont', 'France', 'INV-FR-2024-001', 890.00, 'EUR', '2024-01', 'paid', 'Credit Card'),
    ('Yuki Tanaka', 'Japan', 'INV-JP-2024-001', 145000.00, 'JPY', '2024-01', 'paid', 'Bank Transfer'),
    ('Carlos Silva', 'Brazil', 'INV-BR-2024-001', 4500.00, 'BRL', '2024-01', 'pending', 'Boleto'),
    ('Priya Sharma', 'India', 'INV-IN-2024-001', 85000.00, 'INR', '2024-01', 'paid', 'UPI'),
    ('Li Wei', 'China', 'INV-CN-2024-001', 28000.00, 'CNY', '2024-01', 'paid', 'Alipay'),
    ('Ahmed Hassan', 'UAE', 'INV-AE-2024-001', 5500.00, 'AED', '2024-01', 'overdue', 'Bank Transfer'),
    ('Sofia Garcia', 'Mexico', 'INV-MX-2024-001', 12000.00, 'MXN', '2024-01', 'paid', 'Credit Card'),
    ('James Wilson', 'Australia', 'INV-AU-2024-001', 1800.00, 'AUD', '2024-01', 'paid', 'Direct Debit'),
    ('Anna Kowalski', 'Poland', 'INV-PL-2024-001', 3200.00, 'PLN', '2024-01', 'pending', 'Bank Transfer'),
    ('Kim Min-jun', 'South Korea', 'INV-KR-2024-001', 1500000.00, 'KRW', '2024-01', 'paid', 'KakaoPay'),
    ('Fatima Al-Said', 'Saudi Arabia', 'INV-SA-2024-001', 8500.00, 'SAR', '2024-01', 'paid', 'SADAD'),
    ('Lars Eriksson', 'Sweden', 'INV-SE-2024-001', 7500.00, 'SEK', '2024-01', 'paid', 'Swish'),
    ('Thabo Molefe', 'South Africa', 'INV-ZA-2024-001', 15000.00, 'ZAR', '2024-01', 'overdue', 'EFT'),
    ('Elena Rossi', 'Italy', 'INV-IT-2024-001', 1100.00, 'EUR', '2024-01', 'paid', 'SEPA Direct Debit'),
    ('Hans Mueller', 'Germany', 'INV-DE-2024-002', 1250.00, 'EUR', '2024-02', 'pending', 'SEPA Direct Debit')
  `);

  console.log('Seeding tickets...');
  await pool.query(`
    INSERT INTO tickets (customer_name, country, subject, description, priority, category, status) VALUES
    ('Hans Mueller', 'Germany', 'Data not syncing across devices', 'My enterprise data sync has been failing since yesterday across all connected devices.', 'high', 'Technical', 'open'),
    ('Marie Dupont', 'France', 'Billing discrepancy Q4', 'I noticed extra charges on my Q4 invoice that do not match my plan.', 'medium', 'Billing', 'in_progress'),
    ('Yuki Tanaka', 'Japan', 'Request for data export', 'Need complete data export for compliance audit under APPI regulations.', 'high', 'Compliance', 'open'),
    ('Carlos Silva', 'Brazil', 'Network coverage issue in SP', 'Poor 5G coverage in Sao Paulo business district during peak hours.', 'high', 'Network', 'open'),
    ('Priya Sharma', 'India', 'Plan upgrade request', 'Would like to upgrade from Business to Enterprise plan with data residency guarantee.', 'medium', 'Account', 'in_progress'),
    ('Li Wei', 'China', 'Cross-border data concern', 'Need confirmation that our data stays within China as per PIPL requirements.', 'critical', 'Compliance', 'open'),
    ('Ahmed Hassan', 'UAE', 'VoIP quality degradation', 'International VoIP calls experiencing significant latency and drops.', 'high', 'Technical', 'open'),
    ('Sofia Garcia', 'Mexico', 'SIM card replacement', 'Need eSIM replacement for damaged device. Current SIM is physical nano.', 'low', 'Account', 'resolved'),
    ('James Wilson', 'Australia', 'Roaming charges inquiry', 'Unexpected roaming charges during NZ trip despite having APAC roaming plan.', 'medium', 'Billing', 'in_progress'),
    ('Anna Kowalski', 'Poland', 'GDPR data deletion request', 'Formal request to delete all personal data as per GDPR Article 17.', 'critical', 'Compliance', 'open'),
    ('Kim Min-jun', 'South Korea', 'API rate limiting issues', 'Our M2M SIMs are hitting API rate limits affecting IoT deployment.', 'high', 'Technical', 'open'),
    ('Fatima Al-Said', 'Saudi Arabia', 'Private 5G network inquiry', 'Interested in deploying private 5G network for our campus.', 'medium', 'Sales', 'in_progress'),
    ('Lars Eriksson', 'Sweden', 'IPv6 migration support', 'Need assistance migrating our infrastructure to IPv6.', 'low', 'Technical', 'open'),
    ('Thabo Molefe', 'South Africa', 'Payment gateway failure', 'Unable to process payment through EFT gateway for the past 3 days.', 'high', 'Billing', 'open'),
    ('Elena Rossi', 'Italy', 'Multi-SIM management portal', 'Need access to bulk SIM management portal for fleet devices.', 'medium', 'Account', 'resolved'),
    ('Hans Mueller', 'Germany', 'Security audit request', 'Annual security audit documentation needed for ISO 27001 compliance.', 'high', 'Compliance', 'open')
  `);

  console.log('Seeding network nodes...');
  await pool.query(`
    INSERT INTO network_nodes (node_name, country, city, node_type, ip_address, capacity_gbps, latency_ms, status) VALUES
    ('DE-FRA-CORE-01', 'Germany', 'Frankfurt', 'Core Router', '10.1.1.1', 400.00, 0.5, 'online'),
    ('DE-BER-EDGE-01', 'Germany', 'Berlin', 'Edge Node', '10.1.2.1', 100.00, 2.1, 'online'),
    ('FR-PAR-CORE-01', 'France', 'Paris', 'Core Router', '10.2.1.1', 400.00, 0.6, 'online'),
    ('JP-TYO-CORE-01', 'Japan', 'Tokyo', 'Core Router', '10.3.1.1', 800.00, 0.3, 'online'),
    ('BR-SAO-CORE-01', 'Brazil', 'Sao Paulo', 'Core Router', '10.4.1.1', 200.00, 1.2, 'online'),
    ('IN-MUM-CORE-01', 'India', 'Mumbai', 'Core Router', '10.5.1.1', 400.00, 0.8, 'online'),
    ('CN-SHA-CORE-01', 'China', 'Shanghai', 'Core Router', '10.6.1.1', 800.00, 0.4, 'online'),
    ('AE-DXB-CORE-01', 'UAE', 'Dubai', 'Core Router', '10.7.1.1', 200.00, 1.0, 'online'),
    ('MX-MEX-EDGE-01', 'Mexico', 'Mexico City', 'Edge Node', '10.8.1.1', 100.00, 3.5, 'online'),
    ('AU-SYD-CORE-01', 'Australia', 'Sydney', 'Core Router', '10.9.1.1', 200.00, 0.9, 'online'),
    ('PL-WAR-EDGE-01', 'Poland', 'Warsaw', 'Edge Node', '10.10.1.1', 100.00, 2.8, 'online'),
    ('KR-SEL-CORE-01', 'South Korea', 'Seoul', 'Core Router', '10.11.1.1', 800.00, 0.3, 'online'),
    ('SA-RIY-EDGE-01', 'Saudi Arabia', 'Riyadh', 'Edge Node', '10.12.1.1', 100.00, 2.5, 'maintenance'),
    ('SE-STO-EDGE-01', 'Sweden', 'Stockholm', 'Edge Node', '10.13.1.1', 100.00, 1.5, 'online'),
    ('ZA-JHB-CORE-01', 'South Africa', 'Johannesburg', 'Core Router', '10.14.1.1', 100.00, 3.0, 'online'),
    ('IT-MIL-EDGE-01', 'Italy', 'Milan', 'Edge Node', '10.15.1.1', 200.00, 1.8, 'online')
  `);

  console.log('Seeding SIM cards...');
  await pool.query(`
    INSERT INTO sim_cards (iccid, msisdn, imsi, customer_name, country, sim_type, network_type, status) VALUES
    ('8949010012345678901', '+49-170-1234567', '262010012345678', 'Hans Mueller', 'Germany', 'eSIM', '5G', 'active'),
    ('8933010012345678901', '+33-6-12345678', '208010012345678', 'Marie Dupont', 'France', 'nano', '5G', 'active'),
    ('8981010012345678901', '+81-90-1234-5678', '440100123456789', 'Yuki Tanaka', 'Japan', 'eSIM', '5G', 'active'),
    ('8955010012345678901', '+55-11-98765-4321', '724100123456789', 'Carlos Silva', 'Brazil', 'nano', '4G LTE', 'active'),
    ('8991010012345678901', '+91-98765-43210', '404100123456789', 'Priya Sharma', 'India', 'micro', '4G LTE', 'active'),
    ('8986010012345678901', '+86-138-1234-5678', '460010012345678', 'Li Wei', 'China', 'nano', '5G', 'active'),
    ('8971010012345678901', '+971-50-123-4567', '424100123456789', 'Ahmed Hassan', 'UAE', 'eSIM', '5G', 'active'),
    ('8952010012345678901', '+52-55-1234-5678', '334100123456789', 'Sofia Garcia', 'Mexico', 'nano', '4G LTE', 'active'),
    ('8961010012345678901', '+61-4-1234-5678', '505100123456789', 'James Wilson', 'Australia', 'eSIM', '5G', 'active'),
    ('8948010012345678901', '+48-512-345-678', '260100123456789', 'Anna Kowalski', 'Poland', 'nano', '4G LTE', 'active'),
    ('8982010012345678901', '+82-10-1234-5678', '450100123456789', 'Kim Min-jun', 'South Korea', 'eSIM', '5G', 'active'),
    ('8966010012345678901', '+966-50-123-4567', '420100123456789', 'Fatima Al-Said', 'Saudi Arabia', 'nano', '5G', 'active'),
    ('8946010012345678901', '+46-70-123-4567', '240100123456789', 'Lars Eriksson', 'Sweden', 'eSIM', '5G', 'active'),
    ('8927010012345678901', '+27-72-123-4567', '655100123456789', 'Thabo Molefe', 'South Africa', 'nano', '4G LTE', 'active'),
    ('8939010012345678901', '+39-320-123-4567', '222100123456789', 'Elena Rossi', 'Italy', 'eSIM', '5G', 'active'),
    ('8949010012345678999', '+49-171-9876543', '262010098765432', 'Hans Mueller', 'Germany', 'nano', '4G LTE', 'inactive')
  `);

  console.log('Seeding roaming agreements...');
  await pool.query(`
    INSERT INTO roaming_agreements (partner_name, home_country, roaming_country, agreement_type, data_rate_per_mb, voice_rate_per_min, validity_start, validity_end, status) VALUES
    ('T-Mobile DE', 'Germany', 'France', 'Bilateral', 0.05, 0.15, '2024-01-01', '2025-12-31', 'active'),
    ('Orange FR', 'France', 'Germany', 'Bilateral', 0.05, 0.15, '2024-01-01', '2025-12-31', 'active'),
    ('NTT Docomo', 'Japan', 'South Korea', 'Bilateral', 0.08, 0.20, '2024-01-01', '2025-06-30', 'active'),
    ('Claro BR', 'Brazil', 'Mexico', 'Bilateral', 0.10, 0.25, '2024-03-01', '2025-12-31', 'active'),
    ('Jio', 'India', 'UAE', 'Bilateral', 0.12, 0.30, '2024-01-01', '2025-12-31', 'active'),
    ('China Mobile', 'China', 'Japan', 'Bilateral', 0.08, 0.22, '2024-01-01', '2026-01-01', 'active'),
    ('Etisalat', 'UAE', 'Saudi Arabia', 'Bilateral', 0.06, 0.18, '2024-01-01', '2025-12-31', 'active'),
    ('Telcel', 'Mexico', 'Brazil', 'Bilateral', 0.10, 0.25, '2024-03-01', '2025-12-31', 'active'),
    ('Telstra', 'Australia', 'Japan', 'Bilateral', 0.09, 0.22, '2024-01-01', '2025-12-31', 'active'),
    ('Play PL', 'Poland', 'Germany', 'EU-Regulated', 0.02, 0.05, '2024-01-01', '2025-12-31', 'active'),
    ('SK Telecom', 'South Korea', 'China', 'Bilateral', 0.07, 0.20, '2024-01-01', '2025-12-31', 'active'),
    ('STC', 'Saudi Arabia', 'UAE', 'GCC-Agreement', 0.04, 0.12, '2024-01-01', '2026-01-01', 'active'),
    ('Telia SE', 'Sweden', 'Poland', 'EU-Regulated', 0.02, 0.05, '2024-01-01', '2025-12-31', 'active'),
    ('Vodacom', 'South Africa', 'India', 'Bilateral', 0.15, 0.35, '2024-06-01', '2025-12-31', 'active'),
    ('TIM IT', 'Italy', 'France', 'EU-Regulated', 0.02, 0.05, '2024-01-01', '2025-12-31', 'active'),
    ('Deutsche Telekom', 'Germany', 'Italy', 'EU-Regulated', 0.02, 0.05, '2024-01-01', '2025-12-31', 'active')
  `);

  console.log('Seeding compliance rules...');
  await pool.query(`
    INSERT INTO compliance_rules (rule_name, country, regulation, description, enforcement_date, penalty_amount, currency, severity, status) VALUES
    ('GDPR Data Localization', 'Germany', 'GDPR Art. 44-49', 'Personal data must not be transferred outside EU without adequate safeguards', '2018-05-25', 20000000.00, 'EUR', 'critical', 'active'),
    ('GDPR Right to Erasure', 'France', 'GDPR Art. 17', 'Customers can request complete deletion of personal data within 30 days', '2018-05-25', 10000000.00, 'EUR', 'high', 'active'),
    ('APPI Data Protection', 'Japan', 'APPI Chapter IV', 'Personal information must be handled according to specified purposes within Japan', '2022-04-01', 100000000.00, 'JPY', 'critical', 'active'),
    ('LGPD Data Residency', 'Brazil', 'LGPD Art. 33', 'International data transfer requires explicit consent or regulatory approval', '2020-09-18', 50000000.00, 'BRL', 'critical', 'active'),
    ('DPDP Localization', 'India', 'DPDP Act Sec. 16', 'Critical personal data must be stored and processed within India', '2024-01-01', 2500000000.00, 'INR', 'critical', 'active'),
    ('PIPL Cross-border', 'China', 'PIPL Art. 38-43', 'Personal data export requires security assessment by CAC for critical infrastructure', '2021-11-01', 50000000.00, 'CNY', 'critical', 'active'),
    ('PDPL UAE Compliance', 'UAE', 'PDPL Art. 22', 'Data processing must comply with UAE data protection standards', '2023-01-02', 10000000.00, 'AED', 'high', 'active'),
    ('LFPDPPP Mexico', 'Mexico', 'LFPDPPP Art. 36', 'International transfers require consent and contractual guarantees', '2010-07-06', 5000000.00, 'MXN', 'high', 'active'),
    ('APPs Australia', 'Australia', 'Privacy Act Sec. 8', 'Cross-border disclosure requires reasonable steps to ensure compliance', '2014-03-12', 2100000.00, 'AUD', 'high', 'active'),
    ('GDPR PL Implementation', 'Poland', 'GDPR/Polish DPA', 'GDPR implementation with local supervisory authority oversight', '2018-05-25', 20000000.00, 'EUR', 'critical', 'active'),
    ('PIPA South Korea', 'South Korea', 'PIPA Art. 17', 'Consent required for overseas transfer; data must be securely stored locally', '2020-08-05', 5000000000.00, 'KRW', 'critical', 'active'),
    ('PDPL Saudi Arabia', 'Saudi Arabia', 'PDPL Art. 29', 'Data transfer outside KSA requires SDAIA approval', '2023-09-14', 5000000.00, 'SAR', 'critical', 'active'),
    ('GDPR SE Implementation', 'Sweden', 'GDPR/Swedish DPA', 'Swedish implementation of GDPR with Datainspektionen oversight', '2018-05-25', 20000000.00, 'EUR', 'critical', 'active'),
    ('POPIA South Africa', 'South Africa', 'POPIA Sec. 72', 'Transborder data transfer restrictions with adequacy requirements', '2021-07-01', 10000000.00, 'ZAR', 'high', 'active'),
    ('GDPR IT Implementation', 'Italy', 'GDPR/Codice Privacy', 'Italian GDPR implementation with Garante oversight', '2018-05-25', 20000000.00, 'EUR', 'critical', 'active'),
    ('Telecom Data Retention', 'Germany', 'TKG §176', 'Telecom providers must retain traffic data for 10 weeks', '2021-12-01', 500000.00, 'EUR', 'medium', 'active')
  `);

  console.log('Seeding audit logs...');
  await pool.query(`
    INSERT INTO audit_logs (action, entity_type, entity_id, user_email, country, ip_address, details, risk_level) VALUES
    ('DATA_ACCESS', 'customer', '1', 'admin@telecom.com', 'Germany', '10.1.1.100', 'Accessed customer profile for Hans Mueller', 'low'),
    ('DATA_EXPORT', 'customer', '3', 'operator@jp.telecom.com', 'Japan', '10.3.1.100', 'Bulk data export requested for compliance audit', 'high'),
    ('CONFIG_CHANGE', 'data_zone', '1', 'admin@telecom.com', 'Germany', '10.1.1.100', 'Updated encryption standard for EU-West-Primary zone', 'medium'),
    ('LOGIN_SUCCESS', 'user', '1', 'admin@telecom.com', 'Global', '192.168.1.1', 'Admin login from corporate VPN', 'low'),
    ('DATA_DELETE', 'customer', '12', 'operator@de.telecom.com', 'Russia', '10.1.2.100', 'GDPR erasure request processed for Olga Petrov', 'high'),
    ('CROSS_BORDER_ATTEMPT', 'data_transfer', 'T-001', 'operator@fr.telecom.com', 'France', '10.2.1.100', 'Attempted data transfer to US region - BLOCKED by GDPR rules', 'critical'),
    ('BILLING_UPDATE', 'billing', '7', 'operator@br.telecom.com', 'UAE', '10.7.1.100', 'Payment status updated for Ahmed Hassan invoice', 'low'),
    ('SIM_ACTIVATION', 'sim_card', '8', 'operator@br.telecom.com', 'Mexico', '10.8.1.100', 'New eSIM activated for Sofia Garcia', 'low'),
    ('NETWORK_CHANGE', 'network_node', '13', 'admin@telecom.com', 'Saudi Arabia', '10.12.1.100', 'Node SA-RIY-EDGE-01 put into maintenance mode', 'medium'),
    ('COMPLIANCE_CHECK', 'compliance', '6', 'admin@telecom.com', 'China', '10.6.1.100', 'PIPL compliance verification completed', 'medium'),
    ('LOGIN_FAILED', 'user', 'unknown', 'unknown@attacker.com', 'Global', '203.0.113.50', 'Failed login attempt with invalid credentials', 'high'),
    ('DATA_ACCESS', 'customer', '5', 'operator@de.telecom.com', 'India', '10.5.1.100', 'Accessed Priya Sharma records from Germany office - FLAGGED', 'critical'),
    ('ROAMING_UPDATE', 'roaming', '4', 'admin@telecom.com', 'Brazil', '10.4.1.100', 'Updated roaming rates for Brazil-Mexico agreement', 'low'),
    ('TICKET_ESCALATE', 'ticket', '6', 'operator@jp.telecom.com', 'China', '10.6.1.100', 'PIPL compliance ticket escalated to legal team', 'high'),
    ('ZONE_FAILOVER', 'data_zone', '16', 'admin@telecom.com', 'Poland', '10.10.1.100', 'DR zone activated for EU-East region', 'critical'),
    ('API_RATE_LIMIT', 'api', 'API-KR-001', 'operator@jp.telecom.com', 'South Korea', '10.11.1.100', 'M2M API rate limit exceeded by Kim Min-jun IoT deployment', 'medium')
  `);

  console.log('Seeding translations...');
  await pool.query(`
    INSERT INTO translations (source_text, translated_text, source_language, target_language, country, customer_name, ai_model, status) VALUES
    ('Your account has been successfully upgraded to our Premium 5G plan.', 'Ihr Konto wurde erfolgreich auf unseren Premium-5G-Tarif aktualisiert.', 'English', 'German', 'Germany', 'Hans Mueller', 'anthropic/claude-haiku-4.5', 'completed'),
    ('We have received your data deletion request and will process it within 30 days.', 'Nous avons recu votre demande de suppression de donnees et la traiterons dans les 30 jours.', 'English', 'French', 'France', 'Marie Dupont', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Your monthly invoice is now available for download.', 'Ihre monatliche Rechnung steht nun zum Download bereit.', 'English', 'German', 'Germany', 'Hans Mueller', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Network maintenance scheduled for this weekend.', 'Netzwerkwartung fur dieses Wochenende geplant.', 'English', 'German', 'Germany', 'Hans Mueller', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Your roaming package has been activated for your trip.', 'Votre forfait itinerance a ete active pour votre voyage.', 'English', 'French', 'France', 'Marie Dupont', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Service disruption notice for the Tokyo metropolitan area.', 'Benachrichtigung uber Serviceunterbrechung fur den Grossraum Tokio.', 'English', 'Japanese', 'Japan', 'Yuki Tanaka', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Your data usage has reached 80% of your monthly limit.', 'O uso de dados atingiu 80% do seu limite mensal.', 'English', 'Portuguese', 'Brazil', 'Carlos Silva', 'anthropic/claude-haiku-4.5', 'completed'),
    ('We value your feedback and are working to improve our services.', 'Wir schatzen Ihr Feedback und arbeiten daran, unsere Dienste zu verbessern.', 'English', 'German', 'Germany', 'Hans Mueller', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Your SIM card has been successfully activated.', 'Votre carte SIM a ete activee avec succes.', 'English', 'French', 'France', 'Marie Dupont', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Please verify your identity to complete the account change.', 'Bitte verifizieren Sie Ihre Identitat, um die Kontoänderung abzuschliessen.', 'English', 'German', 'Germany', 'Hans Mueller', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Your support ticket has been escalated to our technical team.', 'Su ticket de soporte ha sido escalado a nuestro equipo tecnico.', 'English', 'Spanish', 'Mexico', 'Sofia Garcia', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Data residency compliance confirmed for your region.', 'Conformite de residence des donnees confirmee pour votre region.', 'English', 'French', 'France', 'Marie Dupont', 'anthropic/claude-haiku-4.5', 'completed'),
    ('New 5G coverage is now available in your area.', 'Ny 5G-tackning ar nu tillganglig i ditt omrade.', 'English', 'Swedish', 'Sweden', 'Lars Eriksson', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Your payment has been processed successfully.', 'Il tuo pagamento e stato elaborato con successo.', 'English', 'Italian', 'Italy', 'Elena Rossi', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Important security update for your account.', 'Atualizacao de seguranca importante para sua conta.', 'English', 'Portuguese', 'Brazil', 'Carlos Silva', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Thank you for choosing our enterprise communication solution.', 'Vielen Dank, dass Sie sich fur unsere Unternehmenskommunikationslosung entschieden haben.', 'English', 'German', 'Germany', 'Hans Mueller', 'anthropic/claude-haiku-4.5', 'completed')
  `);

  console.log('Seeding sentiment analyses...');
  await pool.query(`
    INSERT INTO sentiment_analyses (customer_message, customer_name, country, channel, sentiment, confidence, key_topics, urgency, ai_summary, ai_model, status) VALUES
    ('I am extremely frustrated with the constant network drops in my area!', 'Hans Mueller', 'Germany', 'email', 'negative', 0.95, '["network","coverage","frustration"]', 'high', 'Customer is highly frustrated with persistent network connectivity issues.', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Great service! The 5G upgrade was seamless and speeds are amazing.', 'Marie Dupont', 'France', 'chat', 'positive', 0.92, '["5G","upgrade","satisfaction"]', 'low', 'Customer is very satisfied with the 5G upgrade experience.', 'anthropic/claude-haiku-4.5', 'completed'),
    ('I need to understand how my data is being stored. This is concerning.', 'Yuki Tanaka', 'Japan', 'email', 'negative', 0.72, '["data privacy","storage","concern"]', 'medium', 'Customer has concerns about data storage practices and privacy.', 'anthropic/claude-haiku-4.5', 'completed'),
    ('The billing seems correct this month. Thank you for the adjustment.', 'Carlos Silva', 'Brazil', 'chat', 'positive', 0.85, '["billing","satisfaction","resolution"]', 'low', 'Customer is satisfied with billing correction.', 'anthropic/claude-haiku-4.5', 'completed'),
    ('When will 5G be available in my district? I have been waiting for months.', 'Priya Sharma', 'India', 'phone', 'neutral', 0.68, '["5G","availability","waiting"]', 'medium', 'Customer inquiring about 5G timeline, showing mild impatience.', 'anthropic/claude-haiku-4.5', 'completed'),
    ('This is unacceptable! My data was accessed from outside China!', 'Li Wei', 'China', 'email', 'negative', 0.98, '["data breach","compliance","anger"]', 'high', 'Customer is angry about potential cross-border data access violation.', 'anthropic/claude-haiku-4.5', 'completed'),
    ('The VoIP quality has improved significantly. Good work team!', 'Ahmed Hassan', 'UAE', 'chat', 'positive', 0.88, '["VoIP","quality","improvement"]', 'low', 'Customer appreciates VoIP quality improvements.', 'anthropic/claude-haiku-4.5', 'completed'),
    ('I am considering switching providers due to poor coverage.', 'Sofia Garcia', 'Mexico', 'phone', 'negative', 0.82, '["churn risk","coverage","dissatisfaction"]', 'high', 'Customer at risk of churning due to coverage issues.', 'anthropic/claude-haiku-4.5', 'completed'),
    ('The roaming experience in NZ was perfect. No issues at all.', 'James Wilson', 'Australia', 'email', 'positive', 0.91, '["roaming","satisfaction","travel"]', 'low', 'Customer had excellent roaming experience.', 'anthropic/claude-haiku-4.5', 'completed'),
    ('I want ALL my data deleted. NOW. This is my legal right.', 'Anna Kowalski', 'Poland', 'email', 'negative', 0.94, '["GDPR","data deletion","urgency"]', 'high', 'Customer demanding immediate GDPR data deletion.', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Your IoT platform is excellent for our manufacturing deployment.', 'Kim Min-jun', 'South Korea', 'email', 'positive', 0.87, '["IoT","enterprise","satisfaction"]', 'low', 'Enterprise customer satisfied with IoT platform capabilities.', 'anthropic/claude-haiku-4.5', 'completed'),
    ('We need private 5G deployed within Q2. Can you meet this timeline?', 'Fatima Al-Said', 'Saudi Arabia', 'email', 'neutral', 0.65, '["private 5G","timeline","enterprise"]', 'medium', 'Enterprise customer inquiring about private 5G deployment timeline.', 'anthropic/claude-haiku-4.5', 'completed'),
    ('The IPv6 migration documentation was very helpful. Thanks!', 'Lars Eriksson', 'Sweden', 'chat', 'positive', 0.83, '["IPv6","documentation","satisfaction"]', 'low', 'Customer found technical documentation helpful.', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Three days without being able to pay! This is ridiculous!', 'Thabo Molefe', 'South Africa', 'phone', 'negative', 0.96, '["payment","gateway","frustration"]', 'high', 'Customer extremely frustrated with payment gateway outage.', 'anthropic/claude-haiku-4.5', 'completed'),
    ('The new multi-SIM portal is exactly what we needed for fleet management.', 'Elena Rossi', 'Italy', 'email', 'positive', 0.89, '["SIM management","enterprise","satisfaction"]', 'low', 'Enterprise customer happy with fleet SIM management tools.', 'anthropic/claude-haiku-4.5', 'completed'),
    ('The customer service wait time was too long but the agent was helpful.', 'Hans Mueller', 'Germany', 'phone', 'neutral', 0.62, '["wait time","service quality","mixed"]', 'medium', 'Mixed experience - long wait but good agent support.', 'anthropic/claude-haiku-4.5', 'completed')
  `);

  console.log('Seeding AI support responses...');
  await pool.query(`
    INSERT INTO ai_support_responses (customer_query, customer_name, country, category, language, ai_response, suggested_actions, escalation_needed, estimated_resolution, ai_model, status) VALUES
    ('My internet keeps disconnecting every few hours', 'Hans Mueller', 'Germany', 'Technical', 'German', 'We apologize for the connectivity issues. Our diagnostic tools show intermittent signal fluctuations in your area. We recommend restarting your router and checking for firmware updates. A technician can be dispatched if the issue persists.', '["Run remote diagnostics","Schedule technician visit","Provide service credit"]', false, '24 hours', 'anthropic/claude-haiku-4.5', 'completed'),
    ('I want to know where my personal data is stored', 'Marie Dupont', 'France', 'Compliance', 'French', 'Your personal data is stored exclusively in our Paris DC-2 data center in France, in compliance with GDPR regulations. No data is transferred outside the EU. You can request a full data report under GDPR Article 15.', '["Generate data report","Send privacy policy","Schedule compliance call"]', false, 'immediate', 'anthropic/claude-haiku-4.5', 'completed'),
    ('How can I export all my data for a compliance audit?', 'Yuki Tanaka', 'Japan', 'Compliance', 'Japanese', 'Under APPI regulations, you have the right to access all your personal data. We can prepare a comprehensive data export package within 5 business days. The export will include all data stored in our Tokyo DC-1 facility.', '["Initiate data export","Contact compliance team","Generate audit report"]', false, '48 hours', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Why is 5G so slow in Sao Paulo business district?', 'Carlos Silva', 'Brazil', 'Network', 'Portuguese', 'We are aware of congestion issues in the Sao Paulo business district during peak hours. Network capacity upgrades are scheduled for next month. In the meantime, we can activate traffic prioritization for your business plan.', '["Activate QoS prioritization","Send network status update","Apply service credit"]', false, '1-2 hours', 'anthropic/claude-haiku-4.5', 'completed'),
    ('I need confirmation my data stays in India', 'Priya Sharma', 'India', 'Compliance', 'English', 'We confirm that all your personal and business data is stored exclusively in our Mumbai DC-1 data center in India. This complies with the DPDP Act requirements. We can provide a formal data residency certificate upon request.', '["Generate residency certificate","Schedule security review","Send compliance documentation"]', false, 'immediate', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Someone accessed my data from outside China!', 'Li Wei', 'China', 'Security', 'Chinese', 'We take data sovereignty very seriously. Our security team has been immediately notified and is investigating the access pattern. Under PIPL regulations, we maintain strict cross-border data controls. We will provide a detailed incident report within 24 hours.', '["Launch security investigation","Generate incident report","Contact legal team","Notify CAC if confirmed"]', true, '24 hours', 'anthropic/claude-haiku-4.5', 'completed'),
    ('VoIP calls to India are dropping frequently', 'Ahmed Hassan', 'UAE', 'Technical', 'Arabic', 'We have identified routing issues on the UAE-India VoIP corridor. Our engineering team is implementing a fix through our Dubai DC-1 facility. All voice data remains within the respective countries data zones during transit.', '["Reroute VoIP traffic","Monitor call quality","Provide alternative number"]', false, '1-2 hours', 'anthropic/claude-haiku-4.5', 'completed'),
    ('I need a new eSIM for my replacement phone', 'Sofia Garcia', 'Mexico', 'Account', 'Spanish', 'We can issue a new eSIM profile for your replacement device immediately. The activation will be processed through our Mexico City DC-1 to ensure your data remains within Mexico. Please visit any store or use our app to complete the eSIM transfer.', '["Generate eSIM QR code","Deactivate old SIM","Send activation guide"]', false, 'immediate', 'anthropic/claude-haiku-4.5', 'completed'),
    ('I was charged roaming fees in NZ despite having APAC plan', 'James Wilson', 'Australia', 'Billing', 'English', 'After reviewing your account, it appears the APAC roaming add-on was activated after some charges were incurred. We will reverse the incorrect charges and ensure your plan is properly configured for future travel.', '["Reverse charges","Verify plan configuration","Send corrected invoice"]', false, '24 hours', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Delete all my data immediately as per GDPR', 'Anna Kowalski', 'Poland', 'Compliance', 'Polish', 'Your GDPR Article 17 right to erasure request has been received and logged. We will process the deletion within the mandatory 30-day period. You will receive confirmation once all personal data has been permanently removed from our Warsaw DC-1 systems.', '["Log erasure request","Notify all data processors","Schedule data deletion","Send confirmation"]', true, '48 hours', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Our IoT SIMs are hitting API rate limits', 'Kim Min-jun', 'South Korea', 'Technical', 'Korean', 'We understand the impact on your IoT deployment. Your current plan allows 1000 API calls per minute. We can upgrade your M2M tier to allow 5000 calls per minute, processed through our Seoul DC-1 to maintain data residency.', '["Upgrade API tier","Monitor API usage","Provide dedicated endpoint"]', false, '1-2 hours', 'anthropic/claude-haiku-4.5', 'completed'),
    ('We want to deploy a private 5G network on our campus', 'Fatima Al-Said', 'Saudi Arabia', 'Sales', 'Arabic', 'We would be happy to assist with your private 5G deployment. Our solution includes dedicated spectrum, edge computing at your campus, and all data processing within Saudi Arabia per PDPL requirements. A sales engineer can visit your site within the week.', '["Schedule site survey","Prepare proposal","Assign sales engineer","Send private 5G brochure"]', false, '48 hours', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Need help with IPv6 migration for our infrastructure', 'Lars Eriksson', 'Sweden', 'Technical', 'Swedish', 'We offer comprehensive IPv6 migration support. Our team can provide a migration plan, dual-stack configuration, and testing environment. All network changes will be managed through our Stockholm DC to maintain EU data residency compliance.', '["Create migration plan","Setup test environment","Assign technical consultant"]', false, '48 hours', 'anthropic/claude-haiku-4.5', 'completed'),
    ('I cannot make payments through EFT for 3 days now', 'Thabo Molefe', 'South Africa', 'Billing', 'English', 'We sincerely apologize for the payment gateway disruption. Our team has identified the issue with our EFT integration partner and a fix is being deployed. In the meantime, we can process your payment via credit card or extend your payment deadline.', '["Extend payment deadline","Offer alternative payment","Apply late fee waiver","Escalate to payment team"]', true, '24 hours', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Need access to bulk SIM management for our fleet', 'Elena Rossi', 'Italy', 'Account', 'Italian', 'Our Multi-SIM Management Portal is available for enterprise customers. We can activate access within 24 hours. The portal runs from our Milan DC ensuring Italian data residency. You will be able to manage up to 10000 SIMs from a single dashboard.', '["Activate portal access","Schedule training session","Send admin guide"]', false, '24 hours', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Is my data encrypted at rest and in transit?', 'Hans Mueller', 'Germany', 'Security', 'German', 'Yes, all data is encrypted with AES-256-GCM at rest in our Frankfurt DC-1 and with TLS 1.3 in transit. Encryption keys are managed within Germany and never leave the EU data zone. We can provide our security certification documents upon request.', '["Send security certificates","Schedule security review","Provide encryption details"]', false, 'immediate', 'anthropic/claude-haiku-4.5', 'completed')
  `);

  console.log('Seeding customer intents...');
  await pool.query(`
    INSERT INTO customer_intents (customer_message, customer_name, country, channel, primary_intent, confidence, secondary_intents, entities, recommended_department, priority, ai_model, status) VALUES
    ('My bill is wrong this month, I was charged twice', 'Hans Mueller', 'Germany', 'phone', 'billing_inquiry', 0.94, '["complaint","refund_request"]', '{"issue":"double_charge","period":"current_month"}', 'Billing Department', 'high', 'anthropic/claude-haiku-4.5', 'completed'),
    ('I want to upgrade to the 5G enterprise plan', 'Marie Dupont', 'France', 'chat', 'plan_upgrade', 0.91, '["new_service","general_inquiry"]', '{"target_plan":"5G_enterprise"}', 'Sales Department', 'medium', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Where is my data stored? I need this for our audit', 'Yuki Tanaka', 'Japan', 'email', 'data_usage', 0.87, '["compliance_inquiry","general_inquiry"]', '{"reason":"audit","regulation":"APPI"}', 'Compliance Department', 'high', 'anthropic/claude-haiku-4.5', 'completed'),
    ('The network is down in my office building', 'Carlos Silva', 'Brazil', 'phone', 'technical_support', 0.96, '["complaint","network_issue"]', '{"issue":"network_outage","location":"office"}', 'Technical Support', 'critical', 'anthropic/claude-haiku-4.5', 'completed'),
    ('I want to cancel my subscription effective immediately', 'Priya Sharma', 'India', 'email', 'cancellation', 0.93, '["complaint","account_change"]', '{"action":"cancel","timing":"immediate"}', 'Retention Department', 'critical', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Can you confirm no one outside China accessed my records?', 'Li Wei', 'China', 'email', 'data_usage', 0.85, '["compliance_inquiry","security_concern"]', '{"concern":"cross_border_access","regulation":"PIPL"}', 'Security Department', 'critical', 'anthropic/claude-haiku-4.5', 'completed'),
    ('What are the roaming rates for calls to Pakistan?', 'Ahmed Hassan', 'UAE', 'chat', 'roaming_query', 0.89, '["billing_inquiry","general_inquiry"]', '{"destination":"Pakistan","service":"voice"}', 'Customer Service', 'low', 'anthropic/claude-haiku-4.5', 'completed'),
    ('I need to replace my damaged SIM card', 'Sofia Garcia', 'Mexico', 'phone', 'account_change', 0.88, '["technical_support"]', '{"action":"sim_replacement","reason":"damaged"}', 'Customer Service', 'medium', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Thank you for fixing my roaming issue so quickly!', 'James Wilson', 'Australia', 'email', 'general_inquiry', 0.72, '["feedback_positive"]', '{"topic":"roaming_resolution"}', 'Customer Service', 'low', 'anthropic/claude-haiku-4.5', 'completed'),
    ('I formally request deletion of all personal data under GDPR', 'Anna Kowalski', 'Poland', 'email', 'account_change', 0.91, '["compliance_inquiry","data_usage"]', '{"action":"data_deletion","regulation":"GDPR_Art_17"}', 'Legal/Compliance', 'critical', 'anthropic/claude-haiku-4.5', 'completed'),
    ('We need to increase our M2M API quota for IoT expansion', 'Kim Min-jun', 'South Korea', 'email', 'plan_upgrade', 0.86, '["technical_support","new_service"]', '{"service":"M2M_API","action":"increase_quota"}', 'Enterprise Solutions', 'high', 'anthropic/claude-haiku-4.5', 'completed'),
    ('What enterprise solutions do you offer for campus connectivity?', 'Fatima Al-Said', 'Saudi Arabia', 'email', 'new_service', 0.90, '["general_inquiry","plan_upgrade"]', '{"interest":"private_5G","type":"campus"}', 'Enterprise Sales', 'medium', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Do you support IPv6 on your business plans?', 'Lars Eriksson', 'Sweden', 'chat', 'technical_support', 0.78, '["general_inquiry"]', '{"feature":"IPv6","plan_type":"business"}', 'Technical Support', 'low', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Your payment system has been broken for days!', 'Thabo Molefe', 'South Africa', 'phone', 'complaint', 0.95, '["billing_inquiry","technical_support"]', '{"issue":"payment_gateway","duration":"3_days"}', 'Billing/Technical', 'critical', 'anthropic/claude-haiku-4.5', 'completed'),
    ('We need bulk SIM provisioning for 500 fleet vehicles', 'Elena Rossi', 'Italy', 'email', 'new_service', 0.88, '["account_change","plan_upgrade"]', '{"service":"bulk_SIM","quantity":500,"use_case":"fleet"}', 'Enterprise Solutions', 'high', 'anthropic/claude-haiku-4.5', 'completed'),
    ('I heard you have a new family plan, can you tell me more?', 'Hans Mueller', 'Germany', 'chat', 'general_inquiry', 0.82, '["new_service","plan_upgrade"]', '{"interest":"family_plan"}', 'Sales Department', 'low', 'anthropic/claude-haiku-4.5', 'completed')
  `);

  console.log('Seeding compliance reports...');
  await pool.query(`
    INSERT INTO compliance_reports (country, report_type, scope, period, title, executive_summary, findings, risk_score, compliance_status, action_items, ai_model, status) VALUES
    ('Germany', 'GDPR Audit', 'Data Processing & Storage', 'Q4 2024', 'GDPR Compliance Audit Report - Germany Q4 2024', 'Overall GDPR compliance is strong. All customer data remains within EU boundaries. Minor improvements needed in consent management.', '[{"finding":"Consent forms need updating","severity":"medium","recommendation":"Update consent forms by Q1 2025"},{"finding":"Data retention policies fully compliant","severity":"low","recommendation":"Continue current practices"}]', 22, 'compliant', '["Update consent management forms","Review data processor agreements","Schedule DPO training"]', 'anthropic/claude-haiku-4.5', 'completed'),
    ('France', 'GDPR Audit', 'Cross-border Data Flows', 'Q4 2024', 'Cross-border Data Flow Compliance - France Q4 2024', 'No unauthorized cross-border data transfers detected. All data flows remain within EU jurisdiction through Paris DC-2.', '[{"finding":"All transfers within EU adequacy framework","severity":"low","recommendation":"Maintain current safeguards"},{"finding":"One vendor needs updated DPA","severity":"medium","recommendation":"Renew vendor DPA by March 2025"}]', 18, 'compliant', '["Renew vendor DPA","Update transfer impact assessment","Review SCCs"]', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Japan', 'APPI Assessment', 'Personal Information Handling', 'Q4 2024', 'APPI Personal Information Protection Assessment - Japan Q4 2024', 'APPI compliance confirmed. Personal information handling procedures meet all requirements. Data export processes need documentation update.', '[{"finding":"Export procedures documentation outdated","severity":"medium","recommendation":"Update documentation by Q1 2025"},{"finding":"Access controls properly implemented","severity":"low","recommendation":"Continue regular access reviews"}]', 28, 'compliant', '["Update export documentation","Review access control matrix","Train new staff on APPI"]', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Brazil', 'LGPD Assessment', 'Data Residency Compliance', 'Q4 2024', 'LGPD Data Residency Compliance Report - Brazil Q4 2024', 'LGPD compliance is satisfactory. All Brazilian customer data stored in Sao Paulo DC-1. Consent mechanisms need strengthening.', '[{"finding":"Consent granularity insufficient","severity":"high","recommendation":"Implement granular consent by Q1 2025"},{"finding":"Data residency fully compliant","severity":"low","recommendation":"Maintain current architecture"}]', 35, 'partially_compliant', '["Implement granular consent","Update privacy notices","Conduct DPIA for new services"]', 'anthropic/claude-haiku-4.5', 'completed'),
    ('India', 'DPDP Assessment', 'Critical Data Protection', 'Q4 2024', 'DPDP Act Compliance Assessment - India Q4 2024', 'Critical personal data protection measures are in place. Mumbai DC-1 meets all DPDP Act requirements. Some procedural gaps identified.', '[{"finding":"Incident response time exceeds 72hrs target","severity":"high","recommendation":"Streamline incident response process"},{"finding":"Encryption standards exceed requirements","severity":"low","recommendation":"Continue AES-256 implementation"}]', 32, 'partially_compliant', '["Improve incident response time","Complete DPDP registration","Update data processing agreements"]', 'anthropic/claude-haiku-4.5', 'completed'),
    ('China', 'PIPL Assessment', 'Cross-border Data Security', 'Q4 2024', 'PIPL Cross-border Data Security Assessment - China Q4 2024', 'PIPL compliance requires immediate attention. One potential cross-border data access incident detected and under investigation. SM4 encryption properly implemented.', '[{"finding":"Potential unauthorized cross-border access","severity":"critical","recommendation":"Complete investigation and report to CAC"},{"finding":"SM4 encryption properly deployed","severity":"low","recommendation":"Continue current encryption practices"}]', 65, 'partially_compliant', '["Complete access investigation","Submit CAC report","Enhance access monitoring","Review all access logs"]', 'anthropic/claude-haiku-4.5', 'completed'),
    ('UAE', 'PDPL Assessment', 'Data Processing Standards', 'Q4 2024', 'PDPL Data Processing Compliance - UAE Q4 2024', 'UAE PDPL compliance is strong. Dubai DC-1 operations meet all requirements. VoIP data handling procedures verified.', '[{"finding":"All processing within UAE borders","severity":"low","recommendation":"Maintain current practices"},{"finding":"VoIP metadata retention policy needs update","severity":"medium","recommendation":"Update retention policy by Q2 2025"}]', 20, 'compliant', '["Update VoIP retention policy","Review DPC registration","Schedule annual audit"]', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Mexico', 'LFPDPPP Audit', 'Privacy & Data Protection', 'Q4 2024', 'LFPDPPP Privacy Compliance Audit - Mexico Q4 2024', 'Privacy compliance meets LFPDPPP requirements. Mexico City DC-1 operations nominal. Privacy notices need translation updates.', '[{"finding":"Privacy notice Spanish version outdated","severity":"medium","recommendation":"Update Spanish privacy notices"},{"finding":"Data processing records complete","severity":"low","recommendation":"Continue record maintenance"}]', 25, 'compliant', '["Update privacy notices","Review ARCO procedures","Train customer service on privacy rights"]', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Australia', 'APPs Assessment', 'Privacy Principles Compliance', 'Q4 2024', 'Australian Privacy Principles Assessment Q4 2024', 'APPs compliance satisfactory. Sydney DC-1 meets all requirements. Cross-border disclosure procedures working correctly.', '[{"finding":"APP 8 cross-border disclosure compliant","severity":"low","recommendation":"Maintain disclosure procedures"},{"finding":"APP 11 data security meets standards","severity":"low","recommendation":"Continue security measures"}]', 15, 'compliant', '["Review APP compliance checklist","Update breach notification procedures","Schedule OAIC consultation"]', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Poland', 'GDPR Audit', 'Data Deletion & Retention', 'Q4 2024', 'GDPR Data Deletion Compliance - Poland Q4 2024', 'Data deletion procedures working but response times need improvement. One request exceeded 30-day deadline.', '[{"finding":"One deletion request exceeded deadline","severity":"high","recommendation":"Automate deletion workflow"},{"finding":"Retention schedules properly maintained","severity":"low","recommendation":"Continue scheduled reviews"}]', 42, 'partially_compliant', '["Automate deletion workflow","Add deletion request monitoring","Review all pending requests"]', 'anthropic/claude-haiku-4.5', 'completed'),
    ('South Korea', 'PIPA Assessment', 'Personal Information Processing', 'Q4 2024', 'PIPA Personal Information Assessment - South Korea Q4 2024', 'PIPA compliance strong. Seoul DC-1 operations meet all requirements. IoT data handling procedures verified for M2M deployments.', '[{"finding":"IoT data processing properly documented","severity":"low","recommendation":"Continue documentation practices"},{"finding":"Consent mechanisms meet PIPA standards","severity":"low","recommendation":"Monitor for regulatory updates"}]', 12, 'compliant', '["Review PIPA amendments","Update IoT processing records","Schedule PIPC consultation"]', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Saudi Arabia', 'PDPL Assessment', 'Data Sovereignty', 'Q4 2024', 'PDPL Data Sovereignty Report - Saudi Arabia Q4 2024', 'Data sovereignty measures strong. Riyadh DC-1 meets PDPL requirements. SDAIA registration in progress.', '[{"finding":"SDAIA registration pending","severity":"high","recommendation":"Complete registration by Q1 2025"},{"finding":"Data localization fully implemented","severity":"low","recommendation":"Maintain current architecture"}]', 30, 'partially_compliant', '["Complete SDAIA registration","Update data classification","Review cross-border transfer procedures"]', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Sweden', 'GDPR Audit', 'Telecommunications Data', 'Q4 2024', 'GDPR Telecom Data Compliance - Sweden Q4 2024', 'Full GDPR compliance confirmed for telecom operations. Stockholm DC meets Datainspektionen standards.', '[{"finding":"All telecom data properly classified","severity":"low","recommendation":"Continue classification reviews"},{"finding":"Customer consent properly managed","severity":"low","recommendation":"Maintain consent mechanisms"}]', 10, 'compliant', '["Schedule Datainspektionen review","Update telecom data policies","Review ePrivacy compliance"]', 'anthropic/claude-haiku-4.5', 'completed'),
    ('South Africa', 'POPIA Assessment', 'Information Processing', 'Q4 2024', 'POPIA Information Processing Assessment - South Africa Q4 2024', 'POPIA compliance needs improvement. Payment processing issues highlight need for better system resilience. Data localization compliant.', '[{"finding":"Payment system resilience insufficient","severity":"high","recommendation":"Implement redundant payment gateway"},{"finding":"Information officer properly registered","severity":"low","recommendation":"Maintain registration"}]', 45, 'partially_compliant', '["Implement payment redundancy","Review POPIA conditions","Update processing activities register"]', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Italy', 'GDPR Audit', 'Enterprise Data Processing', 'Q4 2024', 'GDPR Enterprise Processing Compliance - Italy Q4 2024', 'Enterprise data processing compliant with GDPR and Italian Codice Privacy. Milan DC-1 operations verified. Garante recommendations implemented.', '[{"finding":"Enterprise DPAs up to date","severity":"low","recommendation":"Review DPAs annually"},{"finding":"Garante guidelines properly implemented","severity":"low","recommendation":"Monitor Garante updates"}]', 14, 'compliant', '["Annual DPA review","Monitor Garante guidance","Update processing impact assessments"]', 'anthropic/claude-haiku-4.5', 'completed'),
    ('Germany', 'TKG Assessment', 'Telecom Data Retention', 'Q4 2024', 'TKG Data Retention Compliance - Germany Q4 2024', 'TKG Section 176 data retention requirements met. Traffic data retention within mandated 10-week period. Frankfurt DC-1 retention systems operational.', '[{"finding":"Retention periods properly configured","severity":"low","recommendation":"Continue monitoring retention schedules"},{"finding":"Automated deletion after retention period","severity":"low","recommendation":"Verify deletion logs quarterly"}]', 8, 'compliant', '["Verify quarterly deletion logs","Update retention documentation","Schedule BNetzA review"]', 'anthropic/claude-haiku-4.5', 'completed')
  `);

  console.log('Seed completed successfully!');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
