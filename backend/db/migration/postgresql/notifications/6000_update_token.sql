--------------UP
CREATE OR REPLACE FUNCTION notifications.update_token(
    p_token     TEXT,
    p_new_token TEXT DEFAULT NULL
)
RETURNS TABLE (
    id       BIGINT,
    token    TEXT,
    created  TIMESTAMPTZ,
    updated  TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_new_token IS NOT NULL THEN
        RETURN QUERY
        UPDATE notifications.tokens
           SET token   = p_new_token,
               updated = CURRENT_TIMESTAMP
         WHERE token = p_token
        RETURNING id, token, created, updated;
    ELSE
        RETURN QUERY
        UPDATE notifications.tokens
           SET updated = CURRENT_TIMESTAMP
         WHERE token = p_token
        RETURNING id, token, created, updated;
    END IF;
END;
$$;
--------------DOWN
DROP FUNCTION notifications.update_token(TEXT, TEXT);