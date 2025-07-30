type TCustomError = Error & {
    status_code: number;
};

export const throw_error = ({ message, status_code = 500 }: { message: string, status_code?: number }): never => {
    const error = new Error(message) as TCustomError;
    error.status_code = status_code;
    throw error;
};