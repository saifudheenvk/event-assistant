const { Logger } = require("/opt/nodejs/commons/logger");
const logger = new Logger(process.env.logLevel);
const { getValue } = require("/opt/nodejs/commons/secretManagerUtils");
const jwt = require("jsonwebtoken");
const { getItemFromDb } = require("/opt/nodejs/commons/dynamoDBService");

exports.handler = async (event) => {
    logger.info('Triggering JWT Authorizer');

    if (!event.authorizationToken || !event.authorizationToken.startsWith('Bearer ')) {
        logger.warn('Missing or invalid Authorization header');
        throw new Error('Unauthorized');
    }

    try {
        const token = event.authorizationToken.replace('Bearer ', '').trim();
        const secret = await getValue({ SecretId: 'JWT_SECRET' });

        const decoded = jwt.verify(token, secret.SecretString);
        logger.debug(`Decoded token: ${JSON.stringify(decoded)}`);

        const attendeeResult = await getItemFromDb(process.env.ATTENDEES_TABLE, {
            attendeeId: decoded.attendeeId,
        });

        if (!attendeeResult || !attendeeResult.Item) {
            logger.error(`Attendee not found: ${decoded.attendeeId}`);
            throw new Error('Unauthorized');
        }

        return {
            principalId: decoded.attendeeId,
            policyDocument: {
                Version: '2012-10-17',
                Statement: [{
                    Effect: 'Allow',
                    Action: 'execute-api:Invoke',
                    Resource: event.methodArn
                }]
            },
            context: {
                attendeeId: decoded.attendeeId,
                email: decoded.email || '',
            }
        };
    } catch (err) {
        logger.error('Authorization failed', err);
        throw new Error('Unauthorized');
    }
};
