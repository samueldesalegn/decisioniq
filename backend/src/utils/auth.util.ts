import { APIGatewayProxyEvent } from 'aws-lambda';

/**
 * Extracts the Cognito user ID (sub claim) from the request.
 * Primary source: API Gateway Cognito Authorizer claims.
 * Fallback: manual JWT decode (e.g., local testing without authorizer).
 */
export function getUserIdFromEvent(event: APIGatewayProxyEvent): string | null {
    const claims = event.requestContext?.authorizer?.claims;

    if (claims?.sub) {
        return claims.sub as string;
    }

    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return null;
    }

    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf-8'));
        return payload.sub ?? null;
    } catch {
        return null;
    }
}
