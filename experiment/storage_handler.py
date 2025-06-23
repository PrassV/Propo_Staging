import os

import boto3
import redis

from config import REDIS_PORT, REDIS_URL, S3_BUCKET

TMP_DIR = "/tmp"

# Initialize Redis client
_redis_client = redis.Redis(host=REDIS_URL, port=REDIS_PORT)


def check_redis_connection():
    try:
        _redis_client = redis.Redis(host=REDIS_URL, port=REDIS_PORT, socket_timeout=2)
        return _redis_client.ping()
    except (redis.ConnectionError, redis.TimeoutError):
        return False


def upload_to_s3(job_id: str, remote_file_path: str, local_file_path: str):
    """
    Upload file to S3.

    Args:
        job_id: Unique job identifier
        remote_file_path: Path to the file on the SFTP server
        local_file_path: Path to the local temporary file

    Returns:
        Dictionary with storage information
    """
    file_name = os.path.basename(remote_file_path)

    s3 = boto3.client("s3")

    s3_key = f"intake_manager/{job_id}/{file_name}"
    s3.upload_file(local_file_path, S3_BUCKET, s3_key)

    storage_info = {
        "storage": "s3",
        "bucket": S3_BUCKET,
        "s3_key": s3_key,
        "file_name": file_name,
    }

    return storage_info
