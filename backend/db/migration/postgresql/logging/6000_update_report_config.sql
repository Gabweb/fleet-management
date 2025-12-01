--------------UP
CREATE OR REPLACE FUNCTION logging.update_report_config(
  p_id          INT,
  p_report_type VARCHAR,
  p_params      JSONB
)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE logging.report_configs
     SET report_type = p_report_type,
         params      = COALESCE(p_params, '{}'::jsonb),
         updated     = CURRENT_TIMESTAMP
   WHERE id = p_id;
$$;
--------------DOWN
DROP FUNCTION logging.update_report_config(INT, VARCHAR, JSONB);
