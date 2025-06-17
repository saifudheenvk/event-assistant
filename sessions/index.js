const { getItemFromDb, transactWriteItems } = require("/opt/nodejs/commons/dynamoDBService");
const { createErrorResponse, createSuccessResponse } = require("/opt/nodejs/commons/responseUtils");
const { STATUS_CODES } = require("/opt/nodejs/commons/constants");


exports.bookSession = async (event) => {
    try {
        const claims = event.requestContext.authorizer.claims;
        const { sessionId } = event.pathParameters;
        const { eventId } = claims['custom:eventId'];
        const attendeeId = claims.sub;

        const sessionResult = await getItemFromDb(process.env.SESSIONS_TABLE, { sessionId: sessionId });
        if (!sessionResult) {
            return createErrorResponse(STATUS_CODES.BAD_REQUEST, "BAD_REQUEST", "Session Id is invalid");
        }
        const session = sessionResult.Item;
        if(session.capacity <= session.bookedSeats || session.sessionDate < new Date().toISOString()) {
            return createErrorResponse(STATUS_CODES.BAD_REQUEST, "BAD_REQUEST", "Session is full or has passed");
        }

        const registrationItem = {
            sessionId: sessionId,
            attendeeId: attendeeId,
            registrationDate: new Date().toISOString(),
            eventId: eventId
        }

        const transactionParams = {
            TransactItems: [
                {
                    ConditionCheck: {
                        TableName: process.env.SESSION_REGISTRATIONS_TABLE,
                        Key: { sessionId: sessionId, attendeeId: attendeeId },
                        ConditionExpression: "attribute_not_exists(sessionId) AND attribute_not_exists(attendeeId)"
                    }
                },
                {
                    Update: {
                        TableName: process.env.SESSIONS_TABLE,
                        Key: { sessionId: sessionId },
                        UpdateExpression: "SET bookedSeats = bookedSeats + :increment",
                        ConditionExpression: "bookedSeats < :capacity AND sessionDate > :currentDate",
                        ExpressionAttributeValues: { ":increment": 1, ":capacity": session.capacity }
                    }
                },
                {
                    Put: {
                        TableName: process.env.SESSION_REGISTRATIONS_TABLE,
                        Item: registrationItem
                    }
                }
            ]
        }

        await transactWriteItems(transactionParams);
        return createSuccessResponse({
            message: "Session booked successfully",
            sessionRegistration: registrationItem
        }, STATUS_CODES.CREATED);
    } catch (error) {
        logger.error(error);
        const errorMessage = error.name === "TransactionCanceledException" ? "Session is full or has passed" : error.message;
        return createErrorResponse(STATUS_CODES.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", errorMessage);
    }
};

exports.cancelSession = async (event) => {
    try {
        const claims = event.requestContext.authorizer.claims;
        const { sessionId } = event.pathParameters;
        const attendeeId = claims.sub;

        const transactionParams = {
            TransactItems: [
                {
                    Delete: {
                        TableName: process.env.SESSION_REGISTRATIONS_TABLE,
                        Key: { sessionId: sessionId, attendeeId: attendeeId }
                    }
                },
                {
                    Update: {
                        TableName: process.env.SESSIONS_TABLE,
                        Key: { sessionId: sessionId },
                        UpdateExpression: "SET bookedSeats = bookedSeats - :decrement",
                        ConditionExpression: "bookedSeats > 0",
                        ExpressionAttributeValues: { ":decrement": 1 }
                    }
                }
            ]
        }
        await transactWriteItems(transactionParams);
        return createSuccessResponse({
            message: "Session cancelled successfully"
        }, STATUS_CODES.OK);
    } catch (error) {
        logger.error(error);
        const errorMessage = error.name === "TransactionCanceledException" ? "Session is not registered" : error.message;
        return createErrorResponse(STATUS_CODES.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", errorMessage);
    }
};
