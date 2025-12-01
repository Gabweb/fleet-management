--------------UP
CREATE OR REPLACE FUNCTION notifications.get_all_tokens()
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
    SELECT t.id, t.token, t.created, t.updated
      FROM notifications.tokens AS t
     ORDER BY t.created DESC;
END;
$$;
--------------DOWN
DROP FUNCTION notifications.get_all_tokens();