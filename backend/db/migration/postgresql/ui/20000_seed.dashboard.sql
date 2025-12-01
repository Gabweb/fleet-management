--------------UP
INSERT INTO ui.dashboard (id, name) OVERRIDING SYSTEM VALUE VALUES
  (1, 'Default Dashboard');
--------------DOWN
DELETE FROM ui.dashboard WHERE id IN(1,2,3,4,5);