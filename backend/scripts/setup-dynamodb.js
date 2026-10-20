/**
 * DynamoDB Table Setup Script for QueueLess
 *
 * This script creates the required DynamoDB table with the proper schema.
 * Run this after setting up your AWS credentials in .env
 *
 * Usage: node scripts/setup-dynamodb.js
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  CreateTableCommand,
  DescribeTableCommand,
  waitUntilTableExists,
} = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

const config = {
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  tableName: process.env.AWS_DYNAMODB_TABLE || 'queueless-tokens',
};

async function createTable() {
  console.log('[setup] Initializing DynamoDB client...');
  const client = new DynamoDBClient({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  const docClient = DynamoDBDocumentClient.from(client);

  console.log(`[setup] Checking if table "${config.tableName}" exists...`);

  try {
    const describeCommand = new DescribeTableCommand({ TableName: config.tableName });
    await docClient.send(describeCommand);
    console.log(`[setup] Table "${config.tableName}" already exists. Skipping creation.`);
    return;
  } catch (error) {
    if (error.name !== 'ResourceNotFoundException') {
      console.error('[setup] Error checking table:', error.message);
      process.exit(1);
    }
    console.log(`[setup] Table does not exist. Creating...`);
  }

  const createParams = {
    TableName: config.tableName,
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    BillingMode: 'PAY_PER_REQUEST', // On-demand mode - suitable for free tier
    StreamSpecification: {
      StreamEnabled: false,
    },
  };

  try {
    console.log('[setup] Creating table with on-demand billing mode...');
    const createCommand = new CreateTableCommand(createParams);
    const result = await client.send(createCommand);
    console.log(`[setup] Table creation initiated. Table ARN: ${result.TableDescription.TableArn}`);

    console.log('[setup] Waiting for table to become active...');
    await waitUntilTableExists(
      { client, maxWaitTime: 300 },
      { TableName: config.tableName }
    );
    console.log('[setup] Table is now active and ready to use!');

    console.log('\n[setup] ✓ DynamoDB table setup complete!');
    console.log(`[setup] Table name: ${config.tableName}`);
    console.log('[setup] Billing mode: PAY_PER_REQUEST (On-demand)');
    console.log('[setup] This is suitable for AWS Free Tier usage.\n');
  } catch (error) {
    console.error('[setup] Error creating table:', error.message);
    console.error('[setup] Full error:', error);
    process.exit(1);
  }
}

createTable().catch((error) => {
  console.error('[setup] Fatal error:', error);
  process.exit(1);
});
