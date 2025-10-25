CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_creator BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scam_reports (
    id SERIAL PRIMARY KEY,
    telegram_username VARCHAR(255) NOT NULL,
    is_scammer BOOLEAN DEFAULT FALSE,
    report_count INTEGER DEFAULT 0,
    description TEXT,
    reported_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_telegram_username ON scam_reports(telegram_username);
CREATE INDEX idx_users_email ON users(email);