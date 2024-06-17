--------------UP
SELECT set_chunk_time_interval('"devices"."mv.status.presence"', INTERVAL '20 days');

SELECT add_continuous_aggregate_policy(
    '"devices"."mv.status.presence"', 
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '1 second',
    schedule_interval => INTERVAL '2 min',
    if_not_exists => true
);
--------------DOWN
select 1;