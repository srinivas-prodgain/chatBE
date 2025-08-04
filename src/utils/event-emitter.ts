import { EventEmitter } from 'events';
import { TToolStatus } from '../types/shared';

type TEmitToolStatusArgs = {
    status: TToolStatus;
};

export const toolEventEmitter = new EventEmitter();

export const emitToolStatus = ({ status }: TEmitToolStatusArgs) => {
    toolEventEmitter.emit('toolStatus', status);
};
