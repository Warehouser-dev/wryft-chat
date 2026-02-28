use aws_sdk_s3::{Client, config::Region, config::Credentials, config::Builder, config::BehaviorVersion};
use bytes::Bytes;
use std::env;

pub struct S3Storage {
    client: Client,
    bucket: String,
    public_url: String,
}

impl S3Storage {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let endpoint = env::var("S3_ENDPOINT").ok();
        let region = env::var("S3_REGION").unwrap_or_else(|_| "us-east-1".to_string());
        let access_key = env::var("S3_ACCESS_KEY")?;
        let secret_key = env::var("S3_SECRET_KEY")?;
        let bucket = env::var("S3_BUCKET")?;
        let public_url = env::var("S3_PUBLIC_URL").unwrap_or_else(|_| format!("http://localhost:9000/{}", bucket));

        let credentials = Credentials::new(
            access_key,
            secret_key,
            None,
            None,
            "wryft-storage",
        );

        let mut config_builder = Builder::new()
            .behavior_version(BehaviorVersion::latest())
            .region(Region::new(region))
            .credentials_provider(credentials)
            .force_path_style(true);  // Required for MinIO

        // If endpoint is provided (MinIO), use it
        if let Some(endpoint_url) = endpoint {
            config_builder = config_builder.endpoint_url(endpoint_url);
        }

        let config = config_builder.build();
        let client = Client::from_conf(config);

        Ok(Self {
            client,
            bucket,
            public_url,
        })
    }

    pub async fn upload_file(
        &self,
        key: &str,
        data: Bytes,
        content_type: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(key)
            .body(data.into())
            .content_type(content_type)
            .send()
            .await?;

        // Return the S3 key - we'll use file_id for access
        Ok(key.to_string())
    }

    pub async fn get_file(&self, key: &str) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let response = self.client
            .get_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await?;

        let data = response.body.collect().await?;
        Ok(data.to_vec())
    }

    pub async fn delete_file(&self, key: &str) -> Result<(), Box<dyn std::error::Error>> {
        self.client
            .delete_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await?;

        Ok(())
    }

    pub fn get_public_url(&self, key: &str) -> String {
        format!("{}/{}", self.public_url, key)
    }
}

// Helper function to extract key from URL
pub fn extract_key_from_url(url: &str, public_url: &str) -> Option<String> {
    url.strip_prefix(&format!("{}/", public_url))
        .map(|s| s.to_string())
}
