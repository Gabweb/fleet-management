--------------UP
CREATE TABLE device_em.sync (
    device INT NOT NULL,
    channel INT,
    created BIGINT NOT NULL
);
--------------DOWN
DROP TABLE device_em.sync;