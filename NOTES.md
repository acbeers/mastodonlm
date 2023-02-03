# Notes on deployment

Things I did for deployment to my own domain:

- Manually purchased a domain via Route 53.

- Manually created a certificate for use with the domain. This certificate had
  to be created in `us-east-1`, because of some limitations in Cloudfront,
  documented
  [here](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html).

- Used `serverless-domain-manager` to put my Lambda functions behind the custom domain.

- Used `serverless-s3-sync` for synchronizing a built website to S3 and configuring it.

- Used `serverless-website-domain` to put the above behind a custom domain

- Used `serverless-cloudfront-invalidate` to ensure website content was invalidated from Cloudfront on publish.
