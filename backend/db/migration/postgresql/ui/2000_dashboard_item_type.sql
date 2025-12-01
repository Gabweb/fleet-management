--------------UP
CREATE TABLE ui.dashboard_item_type (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR(100) NULL
);
CREATE UNIQUE INDEX ui_dashboard_item_type_id ON ui.dashboard_item_type (id);
--------------DOWN
DROP TABLE ui.dashboard_item_type;