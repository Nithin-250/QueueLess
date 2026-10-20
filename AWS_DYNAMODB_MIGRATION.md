# AWS DynamoDB Migration - QueueLess

## Status: PARTIAL MIGRATION COMPLETE

This document tracks the migration from Firebase to AWS DynamoDB for the QueueLess backend.

## What's Been Completed ✅

### 1. Core Infrastructure
- ✅ Added AWS SDK dependencies (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`)
- ✅ Created DynamoDB configuration module (`src/config/dynamodb.js`)
- ✅ Updated environment configuration (`src/config/env.js`, `.env`, `.env.example`)
- ✅ Created DynamoDB table setup script (`scripts/setup-dynamodb.js`)

### 2. Core Services (Fully Migrated)
- ✅ **queue.service.js** - Token issuance, calling, skipping, referring, queue state management
- ✅ **auth.service.js** - Admin authentication, password management
- ✅ **staff.service.js** - Staff authentication, PIN login, staff management
- ✅ **expiry.service.js** - Token expiry sweep
- ✅ **queueAdmin.service.js** - Queue/counter management

### 3. Frontend
- ✅ Added background images (home-bg.jpg, admin-bg.jpg)
- ✅ Updated Home page with background image
- ✅ Updated Admin Login page with background image

## What's Still Needed ⚠️

### Services Requiring Full Migration (Currently Stubs)
These services have stub implementations that throw errors. Your friend needs to complete these:

1. **messaging.service.js** - In-app messaging between users
2. **notification.service.js** - Push notifications
3. **share.service.js** - Secure capability links
4. **upload.service.js** - File uploads
5. **audit.service.js** - Audit logging
6. **scheduler.service.js** - Scheduled tasks
7. **appointmentMerge.service.js** - Appointment merging
8. **ai/conversation.service.js** - AI assistant conversations

### Controllers Requiring Updates
Controllers that import from the above services will need updates once those services are complete.

### Real-time Updates
**Critical Note**: Firebase provides built-in real-time database updates. DynamoDB does not have this feature out of the box.

To restore real-time functionality, you have two options:

**Option A: AWS AppSync (Recommended)**
- Use AWS AppSync for GraphQL subscriptions
- This provides real-time updates similar to Firebase
- Requires additional AWS configuration

**Option B: Polling**
- Frontend polls the backend every few seconds
- Simpler to implement but less efficient
- No additional AWS services needed

### Frontend Firebase Integration
The frontend currently uses Firebase for real-time data. You'll need to:
1. Remove Firebase SDK from frontend
2. Implement polling or WebSocket connections to backend
3. Update all Firebase listeners to use the new approach

## Setup Instructions

### 1. Install AWS Dependencies
```bash
cd backend
npm install
```

### 2. Configure AWS Credentials
Edit `backend/.env`:
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_DYNAMODB_TABLE=queueless-tokens
```

### 3. Create DynamoDB Table
```bash
cd backend
node scripts/setup-dynamodb.js
```

This creates a table with:
- Primary Key: PK (HASH), SK (RANGE)
- Billing Mode: PAY_PER_REQUEST (On-demand, suitable for Free Tier)

### 4. Start Backend
```bash
cd backend
npm start
```

### 5. Start Frontend
```bash
cd frontend
npm run dev
```

## AWS Free Tier Considerations

### DynamoDB
- **Free Tier**: 25 GB storage, 200M read/write units/month (On-demand)
- **This configuration uses PAY_PER_REQUEST** (On-demand mode)
- Suitable for development and low-traffic production

### EC2 (for backend deployment)
- **Free Tier**: 750 hours/month of t2.micro/t3.micro for 12 months
- Deploy backend to EC2 instance

### S3 + CloudFront (for frontend deployment)
- **Free Tier**: 5 GB storage, 50k GET requests/month
- Deploy frontend static files to S3
- Use CloudFront for CDN

## Data Model

The DynamoDB table uses a single-table design with PK/SK pattern:

| PK Type | SK Type | Purpose |
|---------|---------|---------|
| QUEUE#STATE | STATE | Queue state (running/paused, current token) |
| TOKEN | token-id | Individual tokens |
| COUNTER | COUNTER | Token number counter |
| ADMIN | username | Admin accounts |
| STAFF | username | Staff accounts |
| QUEUE | queue-id | Queue/counter definitions |
| PRESENCE | username | Staff online status |
| CONFIG | CONFIG | App configuration |
| ANNOUNCEMENT | ANNOUNCEMENT | Queue announcements |

## Next Steps for Your Friend

1. **Complete stub services** - Rewrite messaging, notifications, share, upload, audit services
2. **Implement real-time updates** - Choose AppSync or polling approach
3. **Update frontend** - Remove Firebase, implement polling/WebSocket
4. **Test thoroughly** - All functionality should be tested
5. **Deploy to AWS** - Backend to EC2, Frontend to S3+CloudFront

## Important Notes

- The backend will start and basic queue operations will work
- Advanced features (messaging, notifications, file sharing) will return errors
- Real-time updates won't work until you implement AppSync or polling
- Firebase configuration is kept in `.env` for backward compatibility but isn't used

## Support

For issues with this migration:
1. Check AWS credentials are correct
2. Verify DynamoDB table exists
3. Check AWS Free Tier limits
4. Review CloudWatch logs for errors
