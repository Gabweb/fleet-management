--------------UP
SELECT set_chunk_time_interval('device.mv__em_total_act_5_min_history_20_days', INTERVAL '20 days');

SELECT add_continuous_aggregate_policy(
    'device.mv__em_total_act_5_min_history_20_days', 
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '1 second',
    schedule_interval => INTERVAL '2 min',
    if_not_exists => true
);
--------------DOWN
select 1;