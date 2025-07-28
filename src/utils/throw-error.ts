export const throw_error = (message: string, status_code: number = 500): never => {
    const error = new Error(message) as any;
    error.status_code = status_code;
    throw error;
};