--------------UP
CREATE OR REPLACE FUNCTION notifications.delete_token(
    p_token TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM notifications.tokens WHERE token = p_token;
END;
$$;
--------------DOWN
DROP FUNCTION notifications.delete_token(TEXT);