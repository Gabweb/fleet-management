--------------UP
CREATE FUNCTION device.fn_change_trigger() RETURNS trigger AS $$
BEGIN
        IF  	TG_OP = 'INSERT'
        THEN
            INSERT INTO logging.t_history (tabname, schemaname, operation, new_val)
                VALUES (TG_RELNAME, TG_TABLE_SCHEMA, TG_OP, row_to_json(NEW));
                RETURN NEW;
        ELSIF   TG_OP = 'UPDATE'
        THEN
                INSERT INTO logging.t_history (tabname, schemaname, operation, new_val, old_val)
                        VALUES (TG_RELNAME, TG_TABLE_SCHEMA, TG_OP,
                                row_to_json(NEW), row_to_json(OLD));
                RETURN NEW;
        ELSIF   TG_OP = 'DELETE'
        THEN
                INSERT INTO logging.t_history (tabname, schemaname, operation, old_val)
                        VALUES (TG_RELNAME, TG_TABLE_SCHEMA, TG_OP, row_to_json(OLD));
                RETURN OLD;
        END IF;
END;
$$ LANGUAGE 'plpgsql' SECURITY DEFINER;
------example trigger for device.state
-- CREATE TRIGGER device_state_trigger 
-- AFTER INSERT OR UPDATE OR DELETE ON device.state
--         FOR EACH ROW EXECUTE PROCEDURE device.fn_change_trigger();
--------------DOWN
DROP FUNCTION device.fn_change_trigger;