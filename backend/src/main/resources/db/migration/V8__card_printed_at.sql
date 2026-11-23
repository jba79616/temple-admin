ALTER TABLE annual_light_records ADD COLUMN card_printed_at TIMESTAMPTZ;

-- 上線前的年度卡片早已印過，不先標成已印，「只印還沒印過的」會把整年再印一次
UPDATE annual_light_records SET card_printed_at = now() WHERE year <= 2026;
