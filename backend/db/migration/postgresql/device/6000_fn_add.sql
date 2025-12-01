--------------UP
CREATE FUNCTION device.fn_add(p_external_id VARCHAR(50), p_jdoc JSONB)
RETURNS void
AS
$$
BEGIN
    LOCK TABLE device.list IN SHARE ROW EXCLUSIVE MODE;
    IF p_external_id IS NOT NULL AND NOT EXISTS (SELECT * FROM device.list WHERE external_id = p_external_id) THEN
        INSERT INTO device.list (external_id, jdoc) VALUES (p_external_id, p_jdoc);
    ELSIF p_external_id IS NOT NULL THEN
        UPDATE
            device.list
        SET
            jdoc = CASE WHEN p_jdoc IS NOT NULL THEN p_jdoc ELSE jdoc END,
            updated = NOW()::TIMESTAMPTZ
        WHERE 1 = 1
            AND (p_external_id IS NULL OR external_id = p_external_id);
    END IF;
END;
$$
LANGUAGE plpgsql;
--------------DOWN
DROP FUNCTION device.fn_add;