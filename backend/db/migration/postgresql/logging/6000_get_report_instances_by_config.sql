--------------UP
CREATE OR REPLACE FUNCTION logging.get_report_instances_by_config(
  p_report_config_id INT
)
RETURNS SETOF logging.report_instances
LANGUAGE sql
AS $$
  SELECT * FROM logging.report_instances
   WHERE report_config_id = p_report_config_id
   ORDER BY "timestamp" DESC;
$$;
--------------DOWN
DROP FUNCTION logging.get_report_instances_by_config(INT);
