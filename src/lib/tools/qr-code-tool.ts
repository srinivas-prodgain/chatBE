import { tool } from "ai";
import { z } from "zod";
import QRCode from "qrcode";



export const qr_code_tool = tool({
    description: 'Generate a QR code for text, URL, or other data',
    parameters: z.object({
        data: z.string().describe('The data to encode in the QR code (URL, text, etc.)'),
        size: z.number().optional().default(200).describe('Size of the QR code in pixels'),
        format: z.enum(['png', 'svg', 'dataurl']).optional().default('dataurl').describe('Output format'),
        errorLevel: z.enum(['L', 'M', 'Q', 'H']).optional().default('M').describe('Error correction level')
    }),

    execute: async ({ data, size = 200, format = 'dataurl', errorLevel = 'M' }) => {


        console.log('🔧 TOOL CALLED: generateQRCode');
        console.log('📋 Parameters:', { data, size, format, errorLevel });
        console.log('⏰ Timestamp:', new Date().toISOString());



        try {
            const options = {
                errorCorrectionLevel: errorLevel,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                width: size
            };

            let qrCode;

            switch (format) {
                case 'png':
                    qrCode = await QRCode.toBuffer(data, options);
                    return {
                        success: true,
                        data: data,
                        format: 'png',
                        size: size,
                        buffer: qrCode.toString('base64'),
                        timestamp: new Date().toISOString()
                    };

                case 'svg':
                    qrCode = await QRCode.toString(data, { ...options, type: 'svg' });
                    return {
                        success: true,
                        data: data,
                        format: 'svg',
                        size: size,
                        svg: qrCode,
                        timestamp: new Date().toISOString()
                    };

                case 'dataurl':
                    qrCode = await QRCode.toDataURL(data, options);
                    return {
                        success: true,
                        data: data,
                        format: 'dataurl',
                        size: size,
                        dataUrl: qrCode,
                        timestamp: new Date().toISOString()
                    };

                default:
                    qrCode = await QRCode.toDataURL(data, options);
                    return {
                        success: true,
                        data: data,
                        format: 'dataurl',
                        size: size,
                        dataUrl: qrCode,
                        timestamp: new Date().toISOString()
                    };
            }

        } catch (error) {
            console.error('QR Code generation error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                data: data
            };
        }
    }


})