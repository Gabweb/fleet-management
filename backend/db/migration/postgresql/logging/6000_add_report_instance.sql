--------------UP
CREATE OR REPLACE FUNCTION logging.add_report_instance(
  p_file_path        TEXT,
  p_report_config_id INT,
  p_timestamp        TIMESTAMPTZ DEFAULT NULL
)
RETURNS INT
LANGUAGE sql
AS $$
  INSERT INTO logging.report_instances (file_path, report_config_id, "timestamp")
  VALUES (p_file_path, p_report_config_id, COALESCE(p_timestamp, CURRENT_TIMESTAMP))
  RETURNING id;
$$;
--------------DOWN
DROP FUNCTION logging.add_report_instance(TEXT, INT, TIMESTAMPTZ);
