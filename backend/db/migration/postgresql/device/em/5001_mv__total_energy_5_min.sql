--------------UP
SELECT set_chunk_time_interval('device_em.mv__total_energy_5_min', INTERVAL '4 months');

SELECT add_continuous_aggregate_policy(
    'device_em.mv__total_energy_5_min', 
    start_offset => INTERVAL '4 months',
    end_offset => INTERVAL '1 second',
    schedule_interval => INTERVAL '5 minutes',
    if_not_exists => true
);

--------------DOWN
select 1;