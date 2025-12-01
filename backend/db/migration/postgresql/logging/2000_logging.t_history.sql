--------------UP
CREATE TABLE logging.t_history (
        id             	serial,
        tstamp         	timestamp   	DEFAULT now(),
        schemaname     	text,
        tabname        	text,
        operation      	text,
        who            	text        	DEFAULT current_user,
        new_val        	jsonb,
        old_val        	jsonb
);
--------------DOWN
DROP TABLE logging.t_history;