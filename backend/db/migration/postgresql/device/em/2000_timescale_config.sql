--------------UP
SELECT
    alter_job(id,config:=jsonb_set(config,'{drop_after}', '"6 hours"'), next_start:=now(), schedule_interval:=INTERVAL '6 hours')
FROM _timescaledb_config.bgw_job WHERE id = 3;

--------------DOWN
SELECT 123;