--------------UP
CREATE TABLE logging.report_instances (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    file_path          TEXT        NOT NULL,
    report_config_id   INT         NOT NULL,
    "timestamp"        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX logging__report_instances_id ON logging.report_instances (id);
CREATE INDEX report_instances_config_id_idx ON logging.report_instances(report_config_id);
--------------DOWN
DROP TABLE logging.report_instances;
