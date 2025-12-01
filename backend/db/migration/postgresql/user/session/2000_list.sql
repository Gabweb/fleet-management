--------------UP
CREATE TABLE user_session.list (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id INT NOT NULL,
    created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP WITH TIME ZONE DEFAULT NULL
);
CREATE UNIQUE INDEX user_session_list_id ON user_session.list (id);
--------------DOWN
DROP TABLE user_session.list;
