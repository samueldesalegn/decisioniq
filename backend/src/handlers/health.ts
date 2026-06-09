import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
            service: 'DecisionIQ API',
            status: 'healthy',
            version: '1.0.0',
            path: event.path,
            timestamp: new Date().toISOString(),
        }),
    };
};
