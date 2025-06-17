const { Logger } = require("/opt/nodejs/commons/logger");
const logger = new Logger(process.env.logLevel);
const { createSuccessResponse, createErrorResponse, STATUS_CODES } = require("/opt/nodejs/commons/responseUtils");
const { addItemToDb } = require("/opt/nodejs/commons/dynamoDBService");
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { sendEmail } = require("/opt/nodejs/commons/emailService");
const velocityTemplateEngine = require('velocity-template-engine');
const {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand
} = require("@aws-sdk/client-cognito-identity-provider");

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.REGION });


exports.handler = async (event) => {
  try {
    const { email, password, name, phoneNumber, preferences, communicationOptIn, eventId } = JSON.parse(event.body);
    logger.info(`Registering user with email: ${email} with cognito`);
    const attendeeId = uuidv4();

    const signUpCmd = new SignUpCommand({
      ClientId: process.env.USER_POOL_CLIENT_ID,
      Username: attendeeId,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'name', Value: name },
        { Name: 'custom:eventId', Value: eventId },
        { Name: 'phone_number', Value: phoneNumber },
        { Name: 'email_verified', Value: 'true' }
      ]
    });
    await cognitoClient.send(signUpCmd);


    const attendee = await addItemToDb(process.env.ATTENDEES_TABLE, {
      attendeeId: attendeeId,
      email: email,
      name: name,
      phoneNumber: phoneNumber,
      preferences: preferences,
      communicationOptIn: communicationOptIn,
      eventId: eventId
    });

    if (attendee.error) {
      logger.error(`Error registering attendee: ${attendee.error}`);
      return createErrorResponse(STATUS_CODES.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "Failed to register attendee");
    }


    let mergeDataForVelocityTemplateEngine = {
      attendeeName: name,
      attendeeEmail: email,
      attendeePhone: phoneNumber,
      year: new Date().getFullYear(),
    };
    let messageToSend = fs.readFileSync(path.join(__dirname, 'registerEmail.html'), "utf8");
    messageToSend = velocityTemplateEngine.render(messageToSend, mergeDataForVelocityTemplateEngine);
    await sendEmail(email, [], "Welcome to the event", messageToSend);

    const authResponse = await cognitoClient.send(new InitiateAuthCommand({
      UserPoolId: process.env.USER_POOL_ID,
      ClientId: process.env.USER_POOL_CLIENT_ID,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: attendeeId,
        PASSWORD: password
      }
    }));

    const tokens = authResponse.AuthenticationResult;
    return createSuccessResponse({
        message: "User registered successfully",
        token: tokens.IdToken,
        id: attendee.attendeeId,
        eventId: eventId,
    }, STATUS_CODES.CREATED);
  } catch (error) {
    logger.error(`Error registering user: ${error}`);
    return createErrorResponse(STATUS_CODES.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "Failed to register user");
  }
};