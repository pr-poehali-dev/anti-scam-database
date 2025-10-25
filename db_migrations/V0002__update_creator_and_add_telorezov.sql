UPDATE users SET is_creator = true WHERE user_id = '#1001';

INSERT INTO scam_reports (telegram_username, is_scammer, report_count, description, reported_by) 
VALUES ('telorezov', false, 0, 'Проверенный пользователь. Безопасен для взаимодействия.', 1)
ON CONFLICT DO NOTHING;