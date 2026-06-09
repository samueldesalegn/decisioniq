import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({});

export async function readS3ObjectAsText(bucket: string, key: string): Promise<string> {
    const response = await s3.send(
        new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        }),
    );

    return await response.Body!.transformToString();
}

export async function writeJsonToS3(bucket: string, key: string, data: unknown): Promise<void> {
    await s3.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: JSON.stringify(data, null, 2),
            ContentType: 'application/json',
        }),
    );
}

export async function getS3ObjectSize(bucket: string, key: string): Promise<number> {
    const response = await s3.send(
        new HeadObjectCommand({
            Bucket: bucket,
            Key: key,
        }),
    );

    return response.ContentLength ?? 0;
}

export async function readJsonFromS3<T>(bucket: string, key: string): Promise<T> {
    const text = await readS3ObjectAsText(bucket, key);
    return JSON.parse(text) as T;
}
