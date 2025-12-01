--------------UP
CREATE TABLE notifications.tokens (
    id       BIGSERIAL   PRIMARY KEY,
    token    TEXT        NOT NULL UNIQUE,
    created  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--------------DOWN
DROP TABLE notifications.tokens;