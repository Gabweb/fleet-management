--------------UP
INSERT INTO device_group.type (id, name) OVERRIDING SYSTEM VALUE VALUES
  (1, 'Device')
  ,(2, 'Device.Entity')
  ,(3, 'Action');
--------------DOWN
DELETE FROM device_group.type WHERE id IN(1,2,3);