export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
};

export function success(data: unknown, statusCode = 200) {
    return {
        statusCode,
        headers: corsHeaders,
        body: JSON.stringify(data),
    };
}

export function failure(message: string, statusCode = 500, details?: unknown) {
    return {
        statusCode,
        headers: corsHeaders,
        body: JSON.stringify({
            message,
            ...(details ? { details } : {}),
        }),
    };
}
