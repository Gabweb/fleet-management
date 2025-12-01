--------------UP
CREATE TABLE ui.dashboard_item (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    dashboard INT, -- ui.dashboard
    type INT, -- ui.dashboard_item_type
    item INT, -- device id | group id | action id ...
    "order" INT DEFAULT 0, -- id of the previous item (probably)
    sub_item VARCHAR(250) DEFAULT NULL -- json path device_id.component_idx
);
--------------DOWN
DROP TABLE ui.dashboard_item;