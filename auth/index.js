const { Logger } = require("/opt/nodejs/commons/logger");
const logger = new Logger(process.env.logLevel);
const { queryItemFromDb } = require("/opt/nodejs/commons/dynamoDBService");
const { decrypt } = require("/opt/nodejs/commons/encryptionUtils");
const { getValue } = require("/opt/nodejs/commons/secretManagerUtils");
const { createSuccessResponse, createErrorResponse } = require("/opt/nodejs/commons/responseUtils");
const jwt = require("jsonwebtoken");

exports.handler = async (event) => {
  const { email, password } = event.body;
  logger.info(`Authenticating user with email: ${email}`);
  const params = {
    TableName: process.env.ATTENDEES_TABLE,
    IndexName: "email-index",
    KeyConditionExpression: "email = :email",
    ExpressionAttributeValues: {
      ":email": email,
    },
  };
  const response = await queryItemFromDb(params);
  if (response.Items.length === 0) {
    return createErrorResponse(401, "USER_NOT_FOUND", "User not found");
  }
  const user = response.Items[0];
  logger.info(`User: ${user}`);
  const secret = await getValue({ SecretId: 'PASSWORD_SECRET' });
  const decryptedPassword = decrypt(secret.SecretString, user.credentials);
  if (decryptedPassword !== password) {
    return createErrorResponse(401, "INVALID_PASSWORD", "Invalid password");
  }
  logger.info(`User authenticated successfully`);
  const token = jwt.sign({ email: email, userId: user.attendeeId }, secret.SecretString, { expiresIn: '3h' });
  return createSuccessResponse({
    token: token,
    id: user.attendeeId,
  }, 200);
};