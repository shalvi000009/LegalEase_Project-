import { S3Client, CreateBucketCommand, HeadBucketCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const endpoint = process.env.S3_ENDPOINT;
const accessKeyId = process.env.S3_ACCESS_KEY || "minioadmin";
const secretAccessKey = process.env.S3_SECRET_KEY || "minioadminpassword";
export const bucketName = process.env.S3_BUCKET || "legalease-contracts";
const region = process.env.S3_REGION || "us-east-1";
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";
const isMock = process.env.MOCK_SERVICES === "true";

export const s3Client = isMock ? null as any : new S3Client({
  endpoint: endpoint || undefined,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  region,
  forcePathStyle,
});

export const ensureBucketExists = async (): Promise<void> => {
  if (isMock) {
    console.log(`[Mock] S3 bucket "${bucketName}" already exists (mocked).`);
    return;
  }
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log(`S3 bucket "${bucketName}" already exists.`);
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      try {
        await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
        console.log(`S3 bucket "${bucketName}" created successfully.`);
      } catch (createError) {
        console.error(`Failed to create S3 bucket "${bucketName}":`, createError);
        throw createError;
      }
    } else {
      console.error(`Failed to check if S3 bucket "${bucketName}" exists:`, error);
      throw error;
    }
  }
};

export const uploadFile = async (key: string, buffer: Buffer, contentType: string): Promise<string> => {
  if (isMock) {
    console.log(`[Mock] Uploaded file with key "${key}" to bucket (mocked).`);
    return key;
  }
  await s3Client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return key;
};
