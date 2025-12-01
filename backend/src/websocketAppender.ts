import {format} from 'node:util';
import type {AppenderModule, LoggingEvent} from 'log4js';
import {emitConsoleLog} from './modules/ShellyEvents';

function getLogColor(level: string): string {
    switch (level) {
        case 'ERROR':
            return 'red';
        case 'WARN':
            return 'yellow';
        case 'INFO':
            return 'green';
        case 'DEBUG':
            return 'lightblue';
        case 'FATAL':
            return 'purple';
        case 'MARK':
            return 'grey';
        default:
            return 'white';
    }
}

let emitting = false;

function websocketAppender(): (loggingEvent: LoggingEvent) => void {
    return (loggingEvent: LoggingEvent) => {
        if (emitting) return;
        emitting = true;
        try {
            const coloredPart = `${loggingEvent.startTime.toISOString()} - ${loggingEvent.level.levelStr}`;
            const message = format(...loggingEvent.data);
            const logColor = getLogColor(loggingEvent.level.levelStr);

            emitConsoleLog(coloredPart, message, logColor);
        } finally {
            emitting = false;
        }
    };
}

const appender: AppenderModule = {
    configure: () => websocketAppender()
};

export default appender;
