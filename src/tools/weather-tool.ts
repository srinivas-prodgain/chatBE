import { tool } from "ai";
import { z } from "zod";
import { emitToolStatus } from "../utils/event-emitter";
import { ToolStatus } from "../types/shared";

// Types for WeatherAPI.com API responses
type TWeatherData = {
    name: string;
    country: string;
    region: string;
    temperature: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    visibility: number;
    wind_speed: number;
    wind_direction: string;
    wind_degree: number;
    weather_condition: string;
    weather_icon: string;
    cloudiness: number;
    uv_index: number;
    is_day: number;
    local_time: string;
};

type TForecastData = {
    date: string;
    temperature_max: number;
    temperature_min: number;
    condition: string;
    icon: string;
    chance_of_rain: number;
    chance_of_snow: number;
    max_wind_speed: number;
    avg_humidity: number;
    uv_index: number;
    sunrise: string;
    sunset: string;
};

type TWeatherAPICurrentResponse = {
    location: {
        name: string;
        region: string;
        country: string;
        localtime: string;
    };
    current: {
        temp_c: number;
        feelslike_c: number;
        humidity: number;
        pressure_mb: number;
        vis_km: number;
        wind_kph: number;
        wind_dir: string;
        wind_degree: number;
        condition: {
            text: string;
            icon: string;
        };
        cloud: number;
        uv: number;
        is_day: number;
    };
};

type TWeatherAPIForecastResponse = {
    location: {
        name: string;
        region: string;
        country: string;
        localtime: string;
    };
    current: {
        temp_c: number;
        feelslike_c: number;
        humidity: number;
        pressure_mb: number;
        vis_km: number;
        wind_kph: number;
        wind_dir: string;
        wind_degree: number;
        condition: {
            text: string;
            icon: string;
        };
        cloud: number;
        uv: number;
        is_day: number;
    };
    forecast: {
        forecastday: Array<{
            date: string;
            day: {
                maxtemp_c: number;
                mintemp_c: number;
                condition: {
                    text: string;
                    icon: string;
                };
                daily_chance_of_rain: number;
                daily_chance_of_snow: number;
                maxwind_kph: number;
                avghumidity: number;
                uv: number;
            };
            astro: {
                sunrise: string;
                sunset: string;
            };
        }>;
    };
};

const get_current_weather = async ({ city, country_code }: { city: string; country_code?: string }): Promise<TWeatherData> => {
    const api_key = process.env.WEATHERAPI_API_KEY;
    if (!api_key) {
        throw new Error('WeatherAPI.com API key not configured');
    }

    const location = country_code ? `${city},${country_code}` : city;
    const url = `https://api.weatherapi.com/v1/current.json?key=${api_key}&q=${encodeURIComponent(location)}&aqi=no`;

    const response = await fetch(url);
    if (!response.ok) {
        if (response.status === 400) {
            throw new Error(`City "${city}" not found`);
        } else if (response.status === 401 || response.status === 403) {
            throw new Error('Invalid WeatherAPI.com API key');
        }
        throw new Error(`Weather API error: ${response.status}`);
    }

    const data: TWeatherAPICurrentResponse = await response.json();

    return {
        name: data.location.name,
        country: data.location.country,
        region: data.location.region,
        temperature: Math.round(data.current.temp_c),
        feels_like: Math.round(data.current.feelslike_c),
        humidity: data.current.humidity,
        pressure: data.current.pressure_mb,
        visibility: data.current.vis_km,
        wind_speed: data.current.wind_kph,
        wind_direction: data.current.wind_dir,
        wind_degree: data.current.wind_degree,
        weather_condition: data.current.condition.text,
        weather_icon: data.current.condition.icon,
        cloudiness: data.current.cloud,
        uv_index: data.current.uv,
        is_day: data.current.is_day,
        local_time: data.location.localtime
    };
};

const get_weather_forecast = async ({ city, country_code, days = 5 }: { city: string; country_code?: string; days?: number }): Promise<TForecastData[]> => {
    const api_key = process.env.WEATHERAPI_API_KEY;
    if (!api_key) {
        throw new Error('WeatherAPI.com API key not configured');
    }

    const location = country_code ? `${city},${country_code}` : city;
    const forecast_days = Math.min(Math.max(days, 1), 10); // WeatherAPI supports up to 10 days
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${api_key}&q=${encodeURIComponent(location)}&days=${forecast_days}&aqi=no&alerts=no`;

    const response = await fetch(url);
    if (!response.ok) {
        if (response.status === 400) {
            throw new Error(`City "${city}" not found`);
        } else if (response.status === 401 || response.status === 403) {
            throw new Error('Invalid WeatherAPI.com API key');
        }
        throw new Error(`Weather API error: ${response.status}`);
    }

    const data: TWeatherAPIForecastResponse = await response.json();

    return data.forecast.forecastday.map(day => ({
        date: day.date,
        temperature_max: Math.round(day.day.maxtemp_c),
        temperature_min: Math.round(day.day.mintemp_c),
        condition: day.day.condition.text,
        icon: day.day.condition.icon,
        chance_of_rain: day.day.daily_chance_of_rain,
        chance_of_snow: day.day.daily_chance_of_snow,
        max_wind_speed: day.day.maxwind_kph,
        avg_humidity: day.day.avghumidity,
        uv_index: day.day.uv,
        sunrise: day.astro.sunrise,
        sunset: day.astro.sunset
    }));
};

export const weather_tool = tool({
    description: 'Get current weather information and forecasts for any city worldwide using WeatherAPI.com',
    parameters: z.object({
        city: z.string().describe('City name (e.g., "London", "New York")'),
        country_code: z.string().optional().describe('Optional 2-letter country code (e.g., "US", "GB", "IN")'),
        include_forecast: z.boolean().optional().default(false).describe('Include weather forecast up to 10 days'),
        forecast_days: z.number().optional().default(5).describe('Number of forecast days (1-10)')
    }),

    execute: async ({ city, country_code, include_forecast = false, forecast_days = 5 }) => {
        emitToolStatus({ status: { tool: 'weather', status: ToolStatus.Started } });
        console.log('🔧 TOOL CALLED: weather_tool');
        console.log('📋 Parameters:', { city, country_code, include_forecast, forecast_days });
        console.log('⏰ Timestamp:', new Date().toISOString());

        try {
            console.log('🌤️ Fetching weather data...');

            const current_weather = await get_current_weather({ city, country_code });
            let forecast_data: TForecastData[] = [];

            if (include_forecast) {
                forecast_data = await get_weather_forecast({
                    city,
                    country_code,
                    days: Math.max(1, Math.min(forecast_days, 10))
                });
            }

            console.log(`✅ Weather data retrieved for ${current_weather.name}, ${current_weather.country}`);

            emitToolStatus({
                status: {
                    tool: 'weather',
                    status: ToolStatus.Completed,
                    details: {
                        result_count: include_forecast ? forecast_data.length + 1 : 1
                    }
                }
            });

            return {
                success: true,
                location: {
                    city: current_weather.name,
                    country: current_weather.country,
                    region: current_weather.region,
                    local_time: current_weather.local_time
                },
                current: {
                    temperature: current_weather.temperature,
                    feels_like: current_weather.feels_like,
                    condition: current_weather.weather_condition,
                    humidity: current_weather.humidity,
                    pressure: current_weather.pressure,
                    wind_speed: current_weather.wind_speed,
                    wind_direction: current_weather.wind_direction,
                    visibility: current_weather.visibility,
                    cloudiness: current_weather.cloudiness,
                    uv_index: current_weather.uv_index,
                    is_day: current_weather.is_day === 1 ? 'day' : 'night'
                },
                forecast: include_forecast ? forecast_data.map(day => ({
                    date: day.date,
                    temperature_min: day.temperature_min,
                    temperature_max: day.temperature_max,
                    condition: day.condition,
                    chance_of_rain: day.chance_of_rain,
                    chance_of_snow: day.chance_of_snow,
                    max_wind_speed: day.max_wind_speed,
                    avg_humidity: day.avg_humidity,
                    uv_index: day.uv_index,
                    sunrise: day.sunrise,
                    sunset: day.sunset
                })) : [],
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Weather tool error:', error);
            emitToolStatus({
                status: {
                    tool: 'weather',
                    status: ToolStatus.Completed,
                    details: {
                        error: error instanceof Error ? error.message : 'Weather fetch failed'
                    }
                }
            });

            let error_message = 'Weather data fetch failed';
            if (error instanceof Error) {
                if (error.message.includes('not found')) {
                    error_message = `City "${city}" not found. Please check the spelling or try with country code.`;
                } else if (error.message.includes('API key')) {
                    error_message = 'WeatherAPI.com authentication failed - check API key';
                } else if (error.message.includes('429')) {
                    error_message = 'WeatherAPI.com rate limit exceeded - try again later';
                } else {
                    error_message = error.message;
                }
            }

            return {
                success: false,
                error: error_message,
                city: city,
                country_code: country_code || null,
                timestamp: new Date().toISOString()
            };
        }
    }
});