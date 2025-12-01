--------------UP
CREATE OR REPLACE FUNCTION notifications.get_token(
    p_token TEXT
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
    RETURN QUERY
    SELECT id, token, created, updated
      FROM notifications.tokens
     WHERE token = p_token;
END;
$$;
--------------DOWN
DROP FUNCTION notifications.get_token(TEXT);