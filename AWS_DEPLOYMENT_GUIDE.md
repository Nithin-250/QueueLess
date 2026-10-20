# AWS Free Tier Deployment Guide - QueueLess

This guide explains how to deploy the QueueLess system on AWS Free Tier. All services used are within AWS Free Tier limits.

## Prerequisites

- AWS Account (Free Tier eligible)
- Basic knowledge of AWS Console
- Git installed locally
- Node.js 20+ installed locally

## Architecture Overview

```
┌─────────────────┐
│   Frontend      │ (S3 + CloudFront)
│   (React)       │ Free: 5GB storage, 50K requests/month
└────────┬────────┘
         │ HTTPS
         ↓
┌─────────────────┐
│   Backend       │ (EC2 t2.micro)
│   (Node.js)     │ Free: 750 hours/month for 12 months
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   DynamoDB      │
│   (Database)    │ Free: 25GB storage, 200M read/write units/month
└─────────────────┘
```

## Step 1: Set Up AWS Credentials

### 1.1 Create IAM User
1. Go to AWS Console → IAM → Users → "Create user"
2. Username: `queueless-deploy`
3. Select "Attach policies directly"
4. Attach these policies:
   - `AmazonDynamoDBFullAccess`
   - `AmazonEC2FullAccess`
   - `AmazonS3FullAccess`
   - `CloudFrontFullAccess`
5. Click "Create user"
6. **Important**: Copy the Access Key ID and Secret Access Key

### 1.2 Configure AWS CLI (Optional but Recommended)
```bash
aws configure
# Enter your Access Key ID and Secret Access Key
# Default region: us-east-1 (or your preferred region)
```

## Step 2: Create DynamoDB Table

### 2.1 Create Table via AWS Console
1. Go to AWS Console → DynamoDB → "Create table"
2. Table name: `queueless-tokens`
3. Partition key: `PK` (String)
4. Sort key: `SK` (String)
5. Table settings: Customize settings
6. Capacity mode: On-demand (PAY_PER_REQUEST) - **Important for Free Tier**
7. Click "Create table"

### 2.2 Alternative: Use Setup Script
```bash
cd backend
# Update .env with your AWS credentials
node scripts/setup-dynamodb.js
```

## Step 3: Deploy Backend to EC2

### 3.1 Create EC2 Instance
1. Go to AWS Console → EC2 → "Launch Instance"
2. Name: `queueless-backend`
3. OS: Ubuntu Server 22.04 LTS (Free Tier eligible)
4. Instance type: `t2.micro` (Free Tier eligible)
5. Key pair: Create or select an existing key pair
6. Network settings:
   - Create security group
   - Allow SSH (port 22) from your IP
   - Allow HTTP (port 80) from anywhere
   - Allow HTTPS (port 443) from anywhere
   - Allow custom TCP (port 4000) from anywhere (for API)
7. Storage: 8 GB gp2 (Free Tier)
8. Click "Launch instance"

### 3.2 Connect to EC2 Instance
```bash
# SSH into your instance
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# Or using AWS Systems Manager Session Manager (if configured)
```

### 3.3 Install Node.js on EC2
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 3.4 Clone and Setup Backend
```bash
# Clone your repository (replace with your repo URL)
git clone https://github.com/your-username/queueless.git
cd queueless/backend

# Install dependencies
npm install

# Create .env file
nano .env
```

Add these values to `.env`:
```env
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.com

JWT_SECRET=your_secure_random_64_byte_string
JWT_EXPIRES_IN=8h

ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_DYNAMODB_TABLE=queueless-tokens

AVG_SERVICE_TIME_SECONDS=180
TOKEN_EXPIRY_SECONDS=3600

ANALYTICS_SINK=csv
ANALYTICS_CSV_PATH=../analytics/data/queue_events.csv

AI_PROVIDER=grounded
```

### 3.5 Start Backend with PM2
```bash
# Install PM2 for process management
sudo npm install -g pm2

# Start the application
pm2 start src/server.js --name queueless-backend

# Configure PM2 to start on boot
pm2 startup
pm2 save
```

### 3.6 Setup Nginx Reverse Proxy (Optional but Recommended)
```bash
# Install Nginx
sudo apt install -y nginx

# Configure Nginx
sudo nano /etc/nginx/sites-available/queueless
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-api-domain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/queueless /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 4: Deploy Frontend to S3 + CloudFront

### 4.1 Build Frontend Locally
```bash
cd frontend
npm install
npm run build
```

### 4.2 Create S3 Bucket
1. Go to AWS Console → S3 → "Create bucket"
2. Bucket name: `queueless-frontend-unique-name`
3. Region: Same as your other resources
4. Block all public access: **Uncheck** "Block all public access" (to enable static hosting)
5. Click "Create bucket"

### 4.3 Enable Static Website Hosting
1. Go to your bucket → Properties → "Static website hosting"
2. Click "Edit"
3. Enable static website hosting
4. Index document: `index.html`
5. Error document: `index.html`
6. Save changes

### 4.4 Upload Frontend Files
```bash
# Using AWS CLI
aws s3 sync dist/ s3://your-bucket-name --delete

# Or manually upload via AWS Console
# Upload all files from frontend/dist/ to your S3 bucket
```

### 4.5 Set Bucket Policy for Public Access
1. Go to your bucket → Permissions → "Bucket policy"
2. Add this policy (replace with your bucket name):
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        }
    ]
}
```

### 4.6 Setup CloudFront (Optional but Recommended)
1. Go to AWS Console → CloudFront → "Create distribution"
2. Origin domain: Your S3 bucket website endpoint
3. Viewer protocol policy: Redirect HTTP to HTTPS
4. Allowed HTTP methods: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
5. Cache policy: CachingDisabled (for dynamic content)
6. Create distribution

### 4.7 Update Frontend Environment
Before building, update `frontend/.env.local`:
```env
VITE_API_BASE_URL=https://your-api-domain.com/api/v1
```

Then rebuild and upload:
```bash
npm run build
aws s3 sync dist/ s3://your-bucket-name --delete
```

## Step 5: Configure DNS (Optional)

### 5.1 Purchase Domain (if needed)
- Use Route 53 or any domain registrar

### 5.2 Point Domain to CloudFront
1. Go to Route 53 → Hosted zones
2. Create A record alias to your CloudFront distribution

## Step 6: Secure with SSL (Recommended)

### 6.1 Use AWS Certificate Manager (ACM)
1. Go to AWS Console → Certificate Manager
2. Request a public certificate for your domain
3. Validate via DNS
4. Once validated, associate with CloudFront

## Step 7: Monitor and Maintain

### 7.1 Check EC2 Status
```bash
# SSH into EC2
pm2 status
pm2 logs queueless-backend
```

### 7.2 Monitor AWS Free Tier Usage
- Go to AWS Console → Billing → Cost Explorer
- Set up budget alerts to avoid unexpected charges

### 7.3 Backup DynamoDB
```bash
# Enable point-in-time recovery in DynamoDB console
# Or create manual backups
```

## Cost Breakdown (Free Tier)

| Service | Free Tier Limit | Monthly Cost (If Exceeded) |
|---------|----------------|---------------------------|
| EC2 t2.micro | 750 hours/month for 12 months | ~$8.50/month |
| S3 | 5 GB storage, 50K GET requests | ~$0.023/GB, $0.0004/1000 requests |
| CloudFront | 1 TB data transfer, 10M requests | ~$0.085/GB, $0.009/10K requests |
| DynamoDB | 25 GB storage, 200M read/write units | ~$0.25/GB, $1.25M write units |
| **Total (Free Tier)** | **$0/month** | **~$20-30/month if exceeded** |

## Troubleshooting

### Backend won't start
- Check `.env` file has correct AWS credentials
- Verify DynamoDB table exists
- Check PM2 logs: `pm2 logs queueless-backend`

### Frontend can't connect to backend
- Check CORS_ORIGIN in backend `.env`
- Verify security group allows traffic on port 4000
- Check Nginx configuration (if using)

### DynamoDB errors
- Verify IAM user has DynamoDB permissions
- Check table name matches `.env` configuration
- Ensure on-demand billing mode is enabled

## Security Best Practices

1. **Never commit AWS credentials to git**
2. **Use strong passwords for admin accounts**
3. **Enable VPC for EC2 (optional but recommended)**
4. **Use HTTPS only (configure SSL certificates)**
5. **Regularly rotate AWS access keys**
6. **Enable CloudTrail for audit logging**
7. **Set up AWS Budget alerts**

## Scaling Beyond Free Tier

If you exceed free tier limits:

1. **EC2**: Upgrade to larger instance types or use Auto Scaling
2. **DynamoDB**: Switch to provisioned capacity or enable auto-scaling
3. **S3/CloudFront**: No changes needed, pay-as-you-go is cost-effective
4. **Consider AWS Elastic Beanstalk or ECS for easier deployment**

## Faculty Presentation Tips

When presenting to faculty:

1. **Show cost analysis**: Emphasize Free Tier usage ($0/month)
2. **Demonstrate audit logs**: Show accountability features
3. **Explain real-time updates**: Show polling mechanism
4. **Highlight security**: Show authentication and audit trails
5. **Demonstrate scalability**: Explain how it can grow
6. **Show mobile responsiveness**: Test on different devices

## Additional Resources

- [AWS Free Tier Guide](https://aws.amazon.com/free/)
- [DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [S3 Documentation](https://docs.aws.amazon.com/s3/)
