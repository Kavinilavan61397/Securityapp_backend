const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');

/**
 * AWS S3 Service
 * Handles file uploads, downloads, and deletions to/from AWS S3
 */

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const BUCKET_REGION = process.env.AWS_REGION || 'ap-south-1';

/**
 * Upload a file to S3
 * @param {Buffer} fileBuffer - File buffer to upload
 * @param {String} fileName - Original filename
 * @param {String} folder - S3 folder path (e.g., 'posts', 'visits')
 * @param {String} mimeType - File MIME type
 * @returns {Promise<Object>} - { url, key, bucket }
 */
const uploadToS3 = async (fileBuffer, fileName, folder, mimeType) => {
  try {
    if (!BUCKET_NAME) {
      throw new Error('AWS_S3_BUCKET_NAME is not configured');
    }

    // Generate unique filename
    const uniqueSuffix = crypto.randomBytes(16).toString('hex') + '_' + Date.now();
    const fileExtension = path.extname(fileName);
    const uniqueFileName = `${uniqueSuffix}${fileExtension}`;
    
    // Construct S3 key (path)
    const s3Key = `${folder}/${uniqueFileName}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: mimeType,
      // Make object publicly readable
      ACL: 'public-read'
    });

    await s3Client.send(command);

    // Construct public URL
    const publicUrl = `https://${BUCKET_NAME}.s3.${BUCKET_REGION}.amazonaws.com/${s3Key}`;

    return {
      url: publicUrl,
      key: s3Key,
      bucket: BUCKET_NAME,
      fileName: uniqueFileName,
      originalName: fileName
    };

  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

/**
 * Upload multiple files to S3
 * @param {Array} files - Array of file objects { buffer, originalname, mimetype }
 * @param {String} folder - S3 folder path
 * @returns {Promise<Array>} - Array of upload results
 */
const uploadMultipleToS3 = async (files, folder) => {
  try {
    const uploadPromises = files.map(file => {
      const fileBuffer = file.buffer || Buffer.from(file.data, 'base64');
      return uploadToS3(
        fileBuffer,
        file.originalname || file.filename,
        folder,
        file.mimetype
      );
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('S3 Multiple Upload Error:', error);
    throw error;
  }
};

/**
 * Delete a file from S3
 * @param {String} s3Key - S3 object key (path)
 * @returns {Promise<Boolean>}
 */
const deleteFromS3 = async (s3Key) => {
  try {
    if (!BUCKET_NAME) {
      throw new Error('AWS_S3_BUCKET_NAME is not configured');
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('S3 Delete Error:', error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
};

/**
 * Get a signed URL for private files (if needed in future)
 * @param {String} s3Key - S3 object key
 * @param {Number} expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns {Promise<String>} - Signed URL
 */
const getSignedUrlForFile = async (s3Key, expiresIn = 3600) => {
  try {
    if (!BUCKET_NAME) {
      throw new Error('AWS_S3_BUCKET_NAME is not configured');
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('S3 Signed URL Error:', error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
};

/**
 * Check if S3 is configured
 * @returns {Boolean}
 */
const isS3Configured = () => {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET_NAME &&
    process.env.AWS_REGION
  );
};

module.exports = {
  uploadToS3,
  uploadMultipleToS3,
  deleteFromS3,
  getSignedUrlForFile,
  isS3Configured,
  BUCKET_NAME,
  BUCKET_REGION
};

