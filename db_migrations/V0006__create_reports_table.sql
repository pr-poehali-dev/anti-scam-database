-- Создаем таблицу жалоб
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    reporter_id INTEGER NOT NULL REFERENCES users(id),
    reported_user_id INTEGER NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending'
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);