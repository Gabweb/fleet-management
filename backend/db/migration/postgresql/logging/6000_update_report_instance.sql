--------------UP
CREATE OR REPLACE FUNCTION logging.update_report_instance(
  p_id               INT,
  p_file_path        TEXT,
  p_report_config_id INT,
  p_timestamp        TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE logging.report_instances
     SET file_path        = p_file_path,
         report_config_id = p_report_config_id,
         "timestamp"      = COALESCE(p_timestamp, "timestamp")
   WHERE id = p_id;
$$;
--------------DOWN
DROP FUNCTION logging.update_report_instance(INT, TEXT, INT, TIMESTAMPTZ);
