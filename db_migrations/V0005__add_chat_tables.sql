-- Add chat tables
CREATE TABLE t_p69473698_anti_scam_database.chats (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE t_p69473698_anti_scam_database.chat_participants (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER REFERENCES t_p69473698_anti_scam_database.chats(id),
    user_id INTEGER REFERENCES t_p69473698_anti_scam_database.users(id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chat_id, user_id)
);

CREATE TABLE t_p69473698_anti_scam_database.messages (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER REFERENCES t_p69473698_anti_scam_database.chats(id),
    sender_id INTEGER REFERENCES t_p69473698_anti_scam_database.users(id),
    message_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_chat_id ON t_p69473698_anti_scam_database.messages(chat_id);
CREATE INDEX idx_messages_created_at ON t_p69473698_anti_scam_database.messages(created_at);