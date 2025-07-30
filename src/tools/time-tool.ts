import { tool } from "ai";
import { z } from "zod";

export const time_tool = tool({
    description: 'Get current date and time information',
    parameters: z.object({
        timezone: z.string().optional().describe('Timezone (e.g., "America/New_York", "UTC")'),
        format: z.enum(['iso', 'readable', 'timestamp']).optional().default('readable')
    }),

    execute: async ({ timezone = 'UTC', format = 'readable' }) => {
        const now = new Date();

        const options: Intl.DateTimeFormatOptions = {
            timeZone: timezone,
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
        };

        switch (format) {
            case 'iso':
                return {
                    success: true,
                    time: now.toISOString(),
                    timezone
                };
            case 'timestamp':
                return {
                    success: true,
                    time: now.getTime(),
                    timezone
                };
            default:
                return {
                    success: true,
                    time: now.toLocaleString('en-US', options),
                    timezone
                };
        }
    }
});