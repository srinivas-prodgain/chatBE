import { EventEmitter } from 'events';
import { TToolStatus } from '../types/shared';

export const toolEventEmitter = new EventEmitter();

export const emitToolStatus = (status: TToolStatus) => {
    toolEventEmitter.emit('toolStatus', status);
};
