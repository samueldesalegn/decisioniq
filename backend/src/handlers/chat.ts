import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { getAnalysisMetadata } from '../repositories/analysis.repository';
import { readJsonFromS3 } from '../services/s3.service';
import { getUserIdFromEvent } from '../utils/auth.util';
import { failure, success } from '../utils/http-response.util';

const bedrock = new BedrockRuntimeClient({ region: process.env.BEDROCK_REGION || 'us-east-1' });
const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-4-6';

const MAX_MESSAGES = 20; // cap conversation length sent to the model

type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const userId = getUserIdFromEvent(event);

        if (!userId) {
            return failure('Unauthorized', 401);
        }

        const body = JSON.parse(event.body || '{}');
        const analysisId: string | undefined = body.analysisId;
        const messages: ChatMessage[] = body.messages ?? [];

        if (!analysisId) {
            return failure('analysisId is required', 400);
        }

        if (!messages.length || messages[messages.length - 1].role !== 'user') {
            return failure('messages must end with a user message', 400);
        }

        const metadata = await getAnalysisMetadata(analysisId);

        if (!metadata) {
            return failure('Analysis not found', 404);
        }

        if (metadata.userId !== userId) {
            return failure('Forbidden', 403);
        }

        const resultBucket = metadata.resultBucket as string;
        const resultKey = metadata.resultKey as string;

        if (!resultBucket || !resultKey) {
            return failure('Analysis result is not available for chat', 409);
        }

        const result = await readJsonFromS3<Record<string, any>>(resultBucket, resultKey);

        const systemPrompt = buildSystemPrompt(result);

        const command = new InvokeModelCommand({
            modelId: MODEL_ID,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
                anthropic_version: 'bedrock-2023-05-31',
                max_tokens: 1000,
                system: systemPrompt,
                messages: messages.slice(-MAX_MESSAGES).map((m) => ({
                    role: m.role,
                    content: m.content,
                })),
            }),
        });

        const response = await bedrock.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const reply = responseBody.content?.[0]?.text?.trim();

        if (!reply) {
            return failure('AI did not return a response', 502);
        }

        return success({ reply });
    } catch (error) {
        console.error('Chat failed:', error);
        return failure('Failed to generate chat response');
    }
};

function buildSystemPrompt(result: Record<string, any>): string {
    // Trim the heavy parts to control token cost
    const trendSeries = Array.isArray(result.trendSeries) ? result.trendSeries.slice(0, 120) : [];

    const context = {
        profile: result.profile,
        businessKPIs: result.businessKPIs,
        decisionScore: result.decisionScore,
        insights: result.insights,
        recommendations: result.recommendations,
        risks: result.risks,
        trends: result.trends,
        trendSeries,
        executiveSummary: result.executiveSummary,
    };

    return `You are DecisionIQ's data analyst assistant. The user is viewing one of their dataset analyses and wants to discuss it.

Here is the complete analysis data in JSON:

${JSON.stringify(context)}

Rules:
- Answer ONLY based on this analysis data. If asked something the data cannot answer, say so plainly and suggest what additional data would help.
- Be concise: 1-3 short paragraphs unless the user asks for depth.
- Use concrete numbers from the data when relevant.
- If asked about time periods, reference the trendSeries dates precisely.
- Never invent numbers that are not derivable from the data.
- Plain professional English. No headers or bullet lists unless asked.`;
}
