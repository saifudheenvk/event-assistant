const { Logger } = require("/opt/nodejs/commons/logger");
const logger = new Logger(process.env.logLevel);
const { createSuccessResponse, createErrorResponse, STATUS_CODES } = require("/opt/nodejs/commons/responseUtils");
const { encrypt } = require("/opt/nodejs/commons/encryptionUtils");
const { getValue } = require("/opt/nodejs/commons/secretManagerUtils");
const { addItemToDb } = require("/opt/nodejs/commons/dynamoDBService");
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { sendEmail } = require("/opt/nodejs/commons/emailService");
const velocityTemplateEngine = require('velocity-template-engine');

exports.handler = async (event) => {
  try {
    const { email, password, name, phoneNumber, preferences, communicationOptIn, eventId } = event.body;
    logger.info(`Registering user with email: ${email}`);
    const secret = await getValue({ SecretId: 'PASSWORD_SECRET' });
    const encryptedPassword = encrypt(secret.SecretString, password);
    const attendee = await addItemToDb(process.env.ATTENDEES_TABLE, {
        attendeeId: uuidv4(),
        email: email,
        name: name,
        phoneNumber: phoneNumber,
        credentials: encryptedPassword,
        preferences: preferences,
        communicationOptIn: communicationOptIn,
        eventId: eventId,
    });
    if (attendee.error) {
        logger.error(`Error registering user: ${attendee.error}`);
        return createErrorResponse(STATUS_CODES.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "Failed to register user");
    }
    let mergeDataForVelocityTemplateEngine = {
        name: name,
        email: email,
        password: password,
        phoneNumber: phoneNumber,
        preferences: preferences,
        communicationOptIn: communicationOptIn,
    };
    let messageToSend = fs.readFileSync(path.join(__dirname, 'registerEmail.html'), "utf8");
    messageToSend = velocityTemplateEngine.render(messageToSend, mergeDataForVelocityTemplateEngine);
    await sendEmail(email, [], "Welcome to the event", messageToSend);
    return createSuccessResponse({
        message: "User registered successfully",
    }, STATUS_CODES.CREATED);
  } catch (error) {
    logger.error(`Error registering user: ${error}`);
    return createErrorResponse(STATUS_CODES.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "Failed to register user");
  }
};