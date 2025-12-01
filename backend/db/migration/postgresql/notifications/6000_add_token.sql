--------------UP
CREATE OR REPLACE FUNCTION notifications.add_token(
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
    WITH upsert AS (
        INSERT INTO notifications.tokens AS t (token, updated)
        VALUES (p_token, CURRENT_TIMESTAMP)
        ON CONFLICT ON CONSTRAINT tokens_token_key
        DO UPDATE SET updated = CURRENT_TIMESTAMP
        RETURNING t.id, t.token, t.created, t.updated
    )
    SELECT upsert.id, upsert.token, upsert.created, upsert.updated
      FROM upsert;
END;
$$;
--------------DOWN
DROP FUNCTION notifications.add_token(TEXT);