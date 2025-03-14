const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

// Create an S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    // Credentials will be automatically loaded from the environment or instance profile
});

/**
 * List objects in the specified S3 bucket and prefix
 * 
 * @param {string} bucketName - The name of the S3 bucket
 * @param {string} prefix - The prefix/path to list objects from
 * @returns {Promise<Object>} - The list of objects in the bucket
 */
async function listS3Objects(bucketName, prefix = '') {
    try {
        const command = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix,
        });

        const response = await s3Client.send(command);
        return {
            success: true,
            data: response,
            count: response.Contents ? response.Contents.length : 0,
            message: 'Successfully listed objects from S3'
        };
    } catch (error) {
        console.error('Error listing S3 objects:', error);
        return {
            success: false,
            error: error.message,
            message: 'Failed to list objects from S3'
        };
    }
}

module.exports = {
    s3Client,
    listS3Objects
}; 