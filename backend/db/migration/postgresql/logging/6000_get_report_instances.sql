--------------UP
CREATE OR REPLACE FUNCTION logging.get_report_instances()
RETURNS SETOF logging.report_instances
LANGUAGE sql
AS $$
  SELECT
    ri.id,
    ri.file_path,
    ri.report_config_id,
    ri."timestamp"
  FROM logging.report_instances ri
  ORDER BY ri."timestamp" DESC;
$$;
--------------DOWN
DROP FUNCTION logging.get_report_instances();
