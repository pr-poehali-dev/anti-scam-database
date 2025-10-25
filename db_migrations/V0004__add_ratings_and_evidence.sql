ALTER TABLE scam_reports ADD COLUMN evidence_url TEXT;
ALTER TABLE scam_reports ADD COLUMN likes INTEGER DEFAULT 0;
ALTER TABLE scam_reports ADD COLUMN dislikes INTEGER DEFAULT 0;

CREATE TABLE report_evidence (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES scam_reports(id),
    evidence_url TEXT NOT NULL,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_ratings (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES scam_reports(id),
    user_id INTEGER REFERENCES users(id),
    rating_type VARCHAR(10) CHECK (rating_type IN ('like', 'dislike')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(report_id, user_id)
);

CREATE INDEX idx_user_ratings_report ON user_ratings(report_id);
CREATE INDEX idx_report_evidence_report ON report_evidence(report_id);