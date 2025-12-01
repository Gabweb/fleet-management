--------------UP
INSERT INTO ui.dashboard_item_type (id, name) OVERRIDING SYSTEM VALUE VALUES
  (1, 'Device')
  ,(2, 'Device.Entity')
  ,(3, 'Group')
  ,(4, 'Action')
  ,(5, 'UiElement');
--------------DOWN
DELETE FROM ui.dashboard_item_type WHERE id IN(1,2,3,4,5);