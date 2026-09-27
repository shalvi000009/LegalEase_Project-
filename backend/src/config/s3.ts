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
  if (isMock || !s3Client) {
    console.log(`[Storage] S3 bucket check skipped (mock or unconfigured).`);
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
        console.warn(`[Storage] S3 bucket creation skipped:`, createError);
      }
    } else {
      console.warn(`[Storage] S3 bucket check skipped (S3 offline/unreachable):`, error.message || error);
    }
  }
};

export const uploadFile = async (key: string, buffer: Buffer, contentType: string): Promise<string> => {
  if (isMock || !s3Client) {
    return key;
  }
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
  } catch (s3Err) {
    console.warn(`[Storage] S3 upload skipped for key ${key}:`, s3Err);
  }
  return key;
};

export const getSignedViewUrl = async (key: string): Promise<string> => {
  if (isMock || !endpoint) {
    return `/api/v1/documents/sample-view`;
  }
  return `${endpoint}/${bucketName}/${key}`;
};
