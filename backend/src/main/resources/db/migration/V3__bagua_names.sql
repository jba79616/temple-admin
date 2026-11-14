UPDATE light_types AS t
SET name = v.name, short_name = v.name, legacy_code = v.code, updated_at = now()
FROM (VALUES
  ('01', '補財庫'),     ('02', '補事業運'),   ('03', '補紫微星'),   ('04', '補喜桃花'),
  ('05', '制歲破'),     ('06', '制劍鋒'),     ('07', '制死符'),     ('08', '制病符'),
  ('09', '制六害'),     ('10', '制天狗'),     ('11', '制白虎'),     ('12', '制五鬼官符'),
  ('13', '制羊刃血光'), ('14', '制喪門吊客'), ('15', '制亡神官符'), ('16', '制劫財'),
  ('17', '制劫殺'),     ('18', '制斬桃花煞'), ('19', '制空亡'),     ('20', '制元辰'),
  ('21', '剪刀板鐵掃帚'), ('22', '制太陰')
) AS v(code, name)
WHERE t.category = 'BAGUA' AND t.sort_order = 10 + v.code::int;

DELETE FROM light_types WHERE category = 'BAGUA' AND name = '八卦斗 23';
