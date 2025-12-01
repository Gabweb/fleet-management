--------------UP
INSERT INTO ui.config (name, json) OVERRIDING SYSTEM VALUE VALUES
  ('node_red_enable', 'false');
--------------DOWN
DELETE FROM ui.dashboard WHERE id IN(1,2,3,4,5);