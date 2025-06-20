const { Logger } = require("/opt/nodejs/commons/logger");
const logger = new Logger(process.env.logLevel);
const { queryItemFromDb } = require("/opt/nodejs/commons/dynamoDBService");
const { createSuccessResponse, createErrorResponse } = require("/opt/nodejs/commons/responseUtils");
const { CognitoIdentityProviderClient, InitiateAuthCommand } = require("@aws-sdk/client-cognito-identity-provider");

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.REGION });

exports.handler = async (event) => {
  try {
    const { email, password, eventId } = JSON.parse(event.body);
    const requestId = event.requestContext.requestId;
    logger.info(`Authenticating user with email: ${email}`);

    const params = {
      TableName: process.env.ATTENDEES_TABLE,
      IndexName: "email-index",
      KeyConditionExpression: "email = :email AND eventId = :eventId",
      ExpressionAttributeValues: {
        ":email": email,
        ":eventId": eventId,
      },
    };
    const response = await queryItemFromDb(params);
    if (!response.Items || response.Items.length === 0) {
      return createErrorResponse(requestId, 401, "USER_NOT_FOUND", "User not found");
    }

    const user = response.Items[0];
    const adminInitiateAuthCmd = new InitiateAuthCommand({
      UserPoolId: process.env.USER_POOL_ID,
      ClientId: process.env.USER_POOL_CLIENT_ID,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: user.attendeeId,
        PASSWORD: password,
      },
    });
    const authResponse = await cognitoClient.send(adminInitiateAuthCmd);
    const tokens = authResponse.AuthenticationResult;

    
    return createSuccessResponse({
      token: tokens.IdToken,
      id: user.attendeeId,
      eventId: user.eventId,
      message: "User authenticated successfully",
    }, 200);
  } catch (error) {
    logger.error(`Error authenticating user: ${error}`);
    return createErrorResponse(requestId, 401, "INVALID_PASSWORD", "Invalid Credentials");
  }
};