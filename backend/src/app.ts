import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
};

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
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
    } catch (err) {
        console.error(err);

        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Internal server error',
            }),
        };
    }
};
