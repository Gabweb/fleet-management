--------------UP
CREATE OR REPLACE FUNCTION logging.delete_report_instance(
  p_id INT
)
RETURNS VOID
LANGUAGE sql
AS $$
  DELETE FROM logging.report_instances WHERE id = p_id;
$$;
--------------DOWN
DROP FUNCTION logging.delete_report_instance(INT);
