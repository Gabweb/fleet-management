--------------UP
CREATE OR REPLACE FUNCTION logging.get_report_instance(
  p_id INT
)
RETURNS SETOF logging.report_instances
LANGUAGE sql
AS $$
  SELECT
    ri.id,
    ri.file_path,
    ri.report_config_id,
    ri."timestamp"
  FROM logging.report_instances ri
  WHERE ri.id = p_id;
$$;
--------------DOWN
DROP FUNCTION logging.get_report_instance(INT);
