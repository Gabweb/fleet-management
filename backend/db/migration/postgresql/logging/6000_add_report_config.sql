--------------UP
CREATE OR REPLACE FUNCTION logging.add_report_config(
  p_report_type VARCHAR,
  p_params      JSONB
)
RETURNS INT
LANGUAGE sql
AS $$
  INSERT INTO logging.report_configs (report_type, params, updated)
  VALUES (p_report_type, COALESCE(p_params, '{}'::jsonb), CURRENT_TIMESTAMP)
  RETURNING id;
$$;
--------------DOWN
DROP FUNCTION logging.add_report_config(VARCHAR, JSONB);
