const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const config = require('./env');

// Initialize DynamoDB client with AWS credentials from environment
const client = new DynamoDBClient({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

const docClient = DynamoDBDocumentClient.from(client);

// Helper functions for DynamoDB operations
const refs = {
  // Queue state
  queueState: async () => {
    const command = new GetCommand({
      TableName: config.aws.dynamoTable,
      Key: { PK: 'QUEUE#STATE', SK: 'STATE' },
    });
    const result = await docClient.send(command);
    return result.Item;
  },
  setQueueState: async (state) => {
    const command = new PutCommand({
      TableName: config.aws.dynamoTable,
      Item: { PK: 'QUEUE#STATE', SK: 'STATE', ...state },
    });
    await docClient.send(command);
  },

  // Tokens
  tokens: async () => {
    const command = new QueryCommand({
      TableName: config.aws.dynamoTable,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'TOKEN' },
    });
    const result = await docClient.send(command);
    return result.Items;
  },
  token: async (id) => {
    const command = new GetCommand({
      TableName: config.aws.dynamoTable,
      Key: { PK: 'TOKEN', SK: id },
    });
    const result = await docClient.send(command);
    return result.Item;
  },
  setToken: async (token) => {
    const command = new PutCommand({
      TableName: config.aws.dynamoTable,
      Item: { PK: 'TOKEN', SK: token.id, ...token },
    });
    await docClient.send(command);
  },
  updateToken: async (id, updates) => {
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.keys(updates).forEach((key, index) => {
      updateExpressions.push(`#${key} = :val${index}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:val${index}`] = updates[key];
    });

    const command = new UpdateCommand({
      TableName: config.aws.dynamoTable,
      Key: { PK: 'TOKEN', SK: id },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    });
    await docClient.send(command);
  },
  deleteToken: async (id) => {
    const command = new DeleteCommand({
      TableName: config.aws.dynamoTable,
      Key: { PK: 'TOKEN', SK: id },
    });
    await docClient.send(command);
  },

  // Counter
  counter: async () => {
    const command = new GetCommand({
      TableName: config.aws.dynamoTable,
      Key: { PK: 'COUNTER', SK: 'COUNTER' },
    });
    const result = await docClient.send(command);
    return result.Item;
  },
  setCounter: async (value) => {
    const command = new PutCommand({
      TableName: config.aws.dynamoTable,
      Item: { PK: 'COUNTER', SK: 'COUNTER', value },
    });
    await docClient.send(command);
  },
  incrementCounter: async () => {
    const command = new UpdateCommand({
      TableName: config.aws.dynamoTable,
      Key: { PK: 'COUNTER', SK: 'COUNTER' },
      UpdateExpression: 'SET value = if_not_exists(value, :start) + :inc',
      ExpressionAttributeValues: { ':start': 0, ':inc': 1 },
      ReturnValues: 'ALL_NEW',
    });
    const result = await docClient.send(command);
    return result.Attributes.value;
  },

  // Admins
  admins: async () => {
    const command = new QueryCommand({
      TableName: config.aws.dynamoTable,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'ADMIN' },
    });
    const result = await docClient.send(command);
    return result.Items;
  },
  admin: async (username) => {
    const command = new GetCommand({
      TableName: config.aws.dynamoTable,
      Key: { PK: 'ADMIN', SK: username },
    });
    const result = await docClient.send(command);
    return result.Item;
  },
  setAdmin: async (admin) => {
    const command = new PutCommand({
      TableName: config.aws.dynamoTable,
      Item: { PK: 'ADMIN', SK: admin.username, ...admin },
    });
    await docClient.send(command);
  },
  deleteAdmin: async (username) => {
    const command = new DeleteCommand({
      TableName: config.aws.dynamoTable,
      Key: { PK: 'ADMIN', SK: username },
    });
    await docClient.send(command);
  },

  // Staff
  staff: async () => {
    const command = new QueryCommand({
      TableName: config.aws.dynamoTable,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'STAFF' },
    });
    const result = await docClient.send(command);
    return result.Items;
  },
  staffMember: async (username) => {
    const command = new GetCommand({
      TableName: config.aws.dynamoTable,
      Key: { PK: 'STAFF', SK: username },
    });
    const result = await docClient.send(command);
    return result.Item;
  },
  setStaff: async (staff) => {
    const command = new PutCommand({
      TableName: config.aws.dynamoTable,
      Item: { PK: 'STAFF', SK: staff.username, ...staff },
    });
    await docClient.send(command);
  },
  deleteStaff: async (username) => {
    const command = new DeleteCommand({
      TableName: config.aws.dynamoTable,
      Key: { PK: 'STAFF', SK: username },
    });
    await docClient.send(command);
  },

  // Queues
  queues: async () => {
    const command = new QueryCommand({
      TableName: config.aws.dynamoTable,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'QUEUE' },
    });
    const result = await docClient.send(command);
    return result.Items;
  },
  queueDef: async (id) => {
    const command = new GetCommand({
      TableName: config.aws.dynamoTable,
      Key: { PK: 'QUEUE', SK: id },
    });
    const result = await docClient.send(command);
    return result.Item;
  },
  setQueue: async (queue) => {
    const command = new PutCommand({
      TableName: config.aws.dynamoTable,
      Item: { PK: 'QUEUE', SK: queue.id, ...queue },
    });
    await docClient.send(command);
  },
  deleteQueue: async (id) => {
    const command = new DeleteCommand({
      TableName: config.aws.dynamoTable,
      Key: { PK: 'QUEUE', SK: id },
    });
    await docClient.send(command);
  },

  // Presence
  presence: async () => {
    const command = new QueryCommand({
      TableName: config.aws.dynamoTable,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'PRESENCE' },
    });
    const result = await docClient.send(command);
    return result.Items;
  },
  presenceMember: async (username) => {
    const command = new GetCommand({
      TableName: config.aws.dynamoTable,
      Key: { PK: 'PRESENCE', SK: username },
    });
    const result = await docClient.send(command);
    return result.Item;
  },
  setPresence: async (member) => {
    const command = new PutCommand({
      TableName: config.aws.dynamoTable,
      Item: { PK: 'PRESENCE', SK: member.username, ...member },
    });
    await docClient.send(command);
  },

  // Config
  appConfig: async () => {
    const command = new GetCommand({
      TableName: config.aws.dynamoTable,
      Key: { PK: 'CONFIG', SK: 'CONFIG' },
    });
    const result = await docClient.send(command);
    return result.Item;
  },
  setAppConfig: async (configData) => {
    const command = new PutCommand({
      TableName: config.aws.dynamoTable,
      Item: { PK: 'CONFIG', SK: 'CONFIG', ...configData },
    });
    await docClient.send(command);
  },

  // Announcement
  announcement: async () => {
    const command = new GetCommand({
      TableName: config.aws.dynamoTable,
      Key: { PK: 'ANNOUNCEMENT', SK: 'ANNOUNCEMENT' },
    });
    const result = await docClient.send(command);
    return result.Item;
  },
  setAnnouncement: async (announcement) => {
    const command = new PutCommand({
      TableName: config.aws.dynamoTable,
      Item: { PK: 'ANNOUNCEMENT', SK: 'ANNOUNCEMENT', ...announcement },
    });
    await docClient.send(command);
  },

  // Appointments
  appointments: async () => {
    const command = new QueryCommand({
      TableName: config.aws.dynamoTable,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'APPOINTMENT' },
    });
    const result = await docClient.send(command);
    return result.Items;
  },
  appointment: async (id) => {
    const command = new GetCommand({
      TableName: config.aws.dynamoTable,
      Key: { PK: 'APPOINTMENT', SK: id },
    });
    const result = await docClient.send(command);
    return result.Item;
  },
  setAppointment: async (appointment) => {
    const command = new PutCommand({
      TableName: config.aws.dynamoTable,
      Item: { PK: 'APPOINTMENT', SK: appointment.id, ...appointment },
    });
    await docClient.send(command);
  },

  // Audit logs for accountability
  auditLogs: async () => {
    const command = new QueryCommand({
      TableName: config.aws.dynamoTable,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'AUDIT' },
    });
    const result = await docClient.send(command);
    return result.Items;
  },
  auditLog: async (id) => {
    const command = new GetCommand({
      TableName: config.aws.dynamoTable,
      Key: { PK: 'AUDIT', SK: id },
    });
    const result = await docClient.send(command);
    return result.Item;
  },
  setAuditLog: async (event) => {
    const command = new PutCommand({
      TableName: config.aws.dynamoTable,
      Item: { PK: 'AUDIT', SK: event.id, ...event },
    });
    await docClient.send(command);
  },

  // Feedback
  feedback: async () => {
    const command = new QueryCommand({
      TableName: config.aws.dynamoTable,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'FEEDBACK' },
    });
    const result = await docClient.send(command);
    return result.Items;
  },
  setFeedback: async (feedback) => {
    const command = new PutCommand({
      TableName: config.aws.dynamoTable,
      Item: { PK: 'FEEDBACK', SK: feedback.tokenId, ...feedback },
    });
    await docClient.send(command);
  },
};

module.exports = { client, docClient, refs };
