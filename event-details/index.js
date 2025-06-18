const { getItemFromDb, queryItemFromDb, getItemsInBatchFromDb } = require("/opt/nodejs/commons/dynamoDBService");
const { createSuccessResponse, createErrorResponse, STATUS_CODES } = require("/opt/nodejs/commons/responseUtils");
const { Logger } = require("/opt/nodejs/commons/logger");

const logger = new Logger(process.env.logLevel);

exports.getEventDetails = async (event) => {
  const { eventId } = event.pathParameters;
  logger.info(`Getting event details for eventId: ${eventId}`);
  try {
    const eventDetailResponse = await getItemFromDb(process.env.EVENTS_TABLE, { eventId: eventId });
    if (!eventDetailResponse.Item) {
        logger.error(`Event not found for eventId: ${eventId}`);
        return createErrorResponse(STATUS_CODES.NOT_FOUND, "NOT_FOUND", "Event not found");
    }
    const eventDetails = eventDetailResponse.Item;
    const sessionParams = {
        IndexName: "eventId-index",
        KeyConditionExpression: "eventId = :eventId",
        ExpressionAttributeValues: {
            ":eventId": eventId
        }
    }
    const sessionsResponse = await queryItemFromDb(process.env.SESSIONS_TABLE, sessionParams);
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
    const sessionsWithSpeakers = sessions.map(session => {
        const speaker = speakers.find(s => s.speakerId === session.speakerId) || null;
        return {
            ...session,
            speaker
        }
    });
    return createSuccessResponse({
        eventDetails,
        sessions: sessionsWithSpeakers
    });
  } catch (error) {
    logger.error(`Error getting event details for eventId: ${eventId}`, error);
    return createErrorResponse(STATUS_CODES.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "Error getting event details");
  }
  
};