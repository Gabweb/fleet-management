--------------UP
CREATE TABLE organization.list (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    name VARCHAR(300) NULL,
    jdoc JSONB NULL
);
CREATE UNIQUE INDEX organization_list_id ON organization.list (id);
--------------DOWN
DROP TABLE organization.list;

