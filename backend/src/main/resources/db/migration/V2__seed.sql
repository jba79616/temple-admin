INSERT INTO system_configs (config_key, config_value, description) VALUES
  ('current_year',     '2027',         '目前安燈年度（西元）'),
  ('temple_name',      '○○宮',         '寺廟名稱（列印用）'),
  ('temple_address',   '',             '寺廟地址（選填）'),
  ('taisui_relations', '值,沖,刑,害,破', '哪些關係算犯太歲'),
  ('prayer_month',     '十二',          '祈福文月份');

INSERT INTO light_types (category, name, short_name, price, is_taisui, sort_order) VALUES
  ('GENERAL', '光明燈', '光明', 300, FALSE, 1),
  ('GENERAL', '文昌燈', '文昌', 300, FALSE, 2),
  ('GENERAL', '太歲燈', '太歲', 300, TRUE,  3);

INSERT INTO light_types (category, name, short_name, price, is_taisui, sort_order)
SELECT 'BAGUA', '八卦斗 ' || n, '八卦斗 ' || n, 500, FALSE, 10 + n
FROM generate_series(1, 23) AS n;
