--------------UP
CREATE TABLE logging.report_configs (
    id            INT      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    report_type   VARCHAR(128)   NOT NULL,
    params        JSONB          NOT NULL DEFAULT '{}'::jsonb,
    created       TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated       TIMESTAMPTZ    NULL
);
CREATE UNIQUE INDEX logging__report_configs_id ON logging.report_configs (id);

--------------DOWN
DROP TABLE logging.report_configs;
