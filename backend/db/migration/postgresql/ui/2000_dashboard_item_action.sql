--------------UP
CREATE TABLE ui.dashboard_item_action (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR(255) NOT NULL,
    udf JSONB DEFAULT '{}'
);
--------------DOWN
DROP TABLE ui.dashboard_item_action;