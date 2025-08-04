import { z } from 'zod';

// Simple environment variable validation schema
const env_schema = z.object({
    // Database
    MONGODB_URL: z.string().min(1, "MongoDB URL is required"),

    // Server
    PORT: z.coerce.number().default(8000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Frontend
    FRONTEND_URL: z.string().optional(),

    // AI Services (optional in development, required in production)
    GEMINI_API_KEY: z.string().optional(),
    MISTRAL_API_KEY: z.string().min(1, "Mistral API key is required"),
    VOYAGE_API_KEY: z.string().min(1, "Voyage AI API key is required"),

    // External APIs (optional in development)
    TAVILY_API_KEY: z.string().optional(),
    WEATHERAPI_API_KEY: z.string().optional(),

    // Features
    INTELLIGENT_SEARCH: z.string().default('true'),
});

// Validate environment variables
const validate_env = () => {
    try {
        const validated_env = env_schema.parse(process.env);

        // Production-specific validation
        if (validated_env.NODE_ENV === 'production') {
            const production_required = ['GEMINI_API_KEY', 'TAVILY_API_KEY', 'WEATHERAPI_API_KEY'];
            const missing_in_production = production_required.filter(key => !process.env[key]);

            if (missing_in_production.length > 0) {
                console.error('❌ Production environment validation failed:');
                missing_in_production.forEach(key => {
                    console.error(`  - ${key}: Required in production`);
                });
                process.exit(1);
            }
        }

        // Development warnings
        if (validated_env.NODE_ENV === 'development') {
            const optional_keys = ['GEMINI_API_KEY', 'TAVILY_API_KEY', 'WEATHERAPI_API_KEY'];
            const missing_optional = optional_keys.filter(key => !process.env[key]);

            if (missing_optional.length > 0) {
                console.warn('⚠️  Development mode - some optional API keys are missing:');
                missing_optional.forEach(key => {
                    console.warn(`  - ${key}: Some features may not work`);
                });
                console.warn('');
            }
        }

        console.log('✅ Environment variables validated successfully');
        return validated_env;
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('❌ Environment validation failed:');
            error.errors.forEach(err => {
                console.error(`  - ${err.path.join('.')}: ${err.message}`);
            });
            console.error('\nPlease check your .env file and ensure all required variables are set.');
            process.exit(1);
        }
        throw error;
    }
};

// Export validated environment config
export const env = validate_env();

// Helper function to check if we're in production
export const is_production = env.NODE_ENV === 'production';
export const is_development = env.NODE_ENV === 'development';