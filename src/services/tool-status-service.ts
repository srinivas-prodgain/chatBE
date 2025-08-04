import { Response } from 'express';
import { TToolStatus } from '../types/shared';
import { toolEventEmitter } from '../utils/event-emitter';

export const tool_status_service = {
    send_tool_status(status: TToolStatus, res: Response): void {
        const status_chunk = {
            type: 'tool_status',
            ...status
        };
        res.write(`data: ${JSON.stringify(status_chunk)}\n\n`);
    },

    setup_tool_status_handler(res: Response): (status: TToolStatus) => void {
        const handle_tool_status = (status: TToolStatus) => {
            this.send_tool_status(status, res);
        };

        toolEventEmitter.on('toolStatus', handle_tool_status);
        return handle_tool_status;
    },

    cleanup_tool_status_handler(handler: (status: TToolStatus) => void): void {
        toolEventEmitter.off('toolStatus', handler);
    }
}; 