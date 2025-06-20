const { getItemFromDb, queryItemFromDb, getItemsInBatchFromDb } = require("/opt/nodejs/commons/dynamoDBService");
const { createSuccessResponse, createErrorResponse, STATUS_CODES } = require("/opt/nodejs/commons/responseUtils");
const { Logger } = require("/opt/nodejs/commons/logger");

const logger = new Logger(process.env.logLevel);

exports.getEventDetails = async (event) => {
  const { eventId } = event.pathParameters;
  const claims = event.requestContext?.authorizer?.claims || {};
  const attendeeId = claims.sub || null;
  const requestId = event.requestContext.requestId;
  logger.info(`Getting event details for eventId: ${eventId}`);
  try {
    const eventDetailResponse = await getItemFromDb(process.env.EVENTS_TABLE, { eventId: eventId });
    if (!eventDetailResponse.Item) {
        logger.error(`Event not found for eventId: ${eventId}`);
        return createErrorResponse(requestId, STATUS_CODES.NOT_FOUND, "NOT_FOUND", "Event not found");
    }
    const eventDetails = eventDetailResponse.Item;
    const sessionParams = {
        TableName: process.env.SESSIONS_TABLE,
        IndexName: "eventId-index",
        KeyConditionExpression: "eventId = :eventId",
        ExpressionAttributeValues: {
            ":eventId": eventId
        }
    }
    const sessionsResponse = await queryItemFromDb(sessionParams);
    const sessions = sessionsResponse.Items;
    if (sessions.length === 0) {
        logger.info(`No sessions found for eventId: ${eventId}`);
        return createSuccessResponse({
            eventDetails,
            sessions: []
        });
    }
    const speakerIds = [...new Set(sessions.map(s => s.speakerId))];

    const speakersBatchParams = {
        RequestItems: {
            [process.env.SPEAKERS_TABLE]: {
                Keys: speakerIds.map(speakerId => ({ speakerId: speakerId }))
            }
        }
    }
    const speakersResponse = await getItemsInBatchFromDb(speakersBatchParams);
    const speakers = speakersResponse.Responses[process.env.SPEAKERS_TABLE];
    const sessionsWithSpeakers = await Promise.all(sessions.map(async session => {
        const sessionRegistrationResult = attendeeId ? await getItemFromDb(process.env.SESSION_REGISTRATIONS_TABLE, { sessionId: session.sessionId, attendeeId: attendeeId }) : null;
        const isBooked = sessionRegistrationResult?.Item ? true : false;
        const speaker = speakers.find(s => s.speakerId === session.speakerId) || null;
        return {
            ...session,
            speaker,
            isBooked
        }
    }));
    return createSuccessResponse({
        eventDetails,
        sessions: sessionsWithSpeakers
    });
  } catch (error) {
    logger.error(`Error getting event details for eventId: ${eventId}`, error);
    return createErrorResponse(requestId, STATUS_CODES.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "Error getting event details");
  }
  
};


exports.getCurrentAttendee = async (event) => {
  const requestId = event.requestContext.requestId;
  const claims = event.requestContext?.authorizer?.claims || {};
  const attendeeId = claims.sub || null;
  logger.info(`Getting current attendee for attendeeId: ${attendeeId}`);
  try {
    const attendeeResponse = await getItemFromDb(process.env.ATTENDEES_TABLE, { attendeeId: attendeeId });
    if (!attendeeResponse.Item) {
      logger.error(`Attendee not found for attendeeId: ${attendeeId}`);
      return createErrorResponse(requestId, STATUS_CODES.NOT_FOUND, "NOT_FOUND", "Attendee not found");
    }
    const attendee = attendeeResponse.Item;
    return createSuccessResponse(attendee);
  } catch (error) {
    logger.error(`Error getting current attendee`, error);
    return createErrorResponse(requestId, STATUS_CODES.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "Error getting current attendee");
  }
}