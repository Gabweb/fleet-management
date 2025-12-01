--------------UP
INSERT INTO "user".list
  (id, enabled, "group", permissions, name, password, full_name, email)
OVERRIDING SYSTEM VALUE VALUES
  (1, true, 'admin', '{*}', 'admin', 'admin', 'Platform Admin', 'example@shelly.com');
--------------DOWN
SELECT 1;