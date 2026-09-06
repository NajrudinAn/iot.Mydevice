-- 013_custom_frontends.sql

CREATE TABLE IF NOT EXISTS application_frontends (
    application_id UUID PRIMARY KEY REFERENCES applications(id) ON DELETE CASCADE,
    html_content TEXT DEFAULT '',
    css_content TEXT DEFAULT '',
    js_content TEXT DEFAULT '',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
