--------------UP
CREATE OR REPLACE FUNCTION logging.delete_all_report_instances()
RETURNS VOID
LANGUAGE sql
AS $$
  DELETE FROM logging.report_instances;
$$;
--------------DOWN
DROP FUNCTION logging.delete_all_report_instances();
