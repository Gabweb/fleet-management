--------------UP
CREATE OR REPLACE FUNCTION logging.get_report_config(
  p_id INT
)
RETURNS table (
    id            INT,
    report_type   VARCHAR(128),
    params        JSONB
    )
LANGUAGE sql
AS
$$
  SELECT
    rc.id,
    rc.report_type,
    rc.params
  FROM logging.report_configs rc
  WHERE rc.id = p_id;
$$;
--------------DOWN
DROP FUNCTION logging.get_report_config(INT);
