--------------UP
CREATE TABLE device_group.item (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "group" INT, -- device_group.list
    type INT, -- device_group.dashboard_type
    item INT, -- device id | group id | action id ...
    "order" INT DEFAULT 0, -- id of the previous item (probably)
    sub_item VARCHAR(250) DEFAULT NULL -- json path device_id.component_idx
);
--------------DOWN
DROP TABLE device_group.item;