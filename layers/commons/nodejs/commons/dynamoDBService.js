const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand, BatchGetCommand, ScanCommand, TransactWriteCommand } = require("@aws-sdk/lib-dynamodb");
const { Logger } = require("/opt/nodejs/commons/logger");

const logger = new Logger(process.env.logLevel);
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        removeUndefinedValues: true
    }
});

/**
 * Get single entry from dynamo db table
 * @param {string} tableName 
 * @param {object} key 
 * @returns 
 */
async function getItemFromDb(tableName, key) {
    const command = new GetCommand({
        TableName: tableName,
        Key: key,
    });

    const response = await docClient.send(command);
    logger.debug(response);
    return response;
}

/**
 * Add new entry to dynamodb table
 * @param {string} tableName 
 * @param {object} itemToAdd 
 * @returns 
 */
async function addItemToDb(tableName, itemToAdd) {
    const command = new PutCommand({
        TableName: tableName,
        Item: itemToAdd,
    });

    const response = await docClient.send(command);
    logger.debug(response);
    return response;
}

/**
 * Queries data from dynamodb table and sends back results
 * @param {object} params 
 * @returns 
 */
async function queryItemFromDb(params) {
    const queryCommandInput = {
        TableName: params.TableName,
        KeyConditionExpression: params.KeyConditionExpression,
        ExpressionAttributeValues: params.ExpressionAttributeValues,
    };
    if (params.ConsistentRead) {
        /** For a query on a table or on a local secondary index, you can set the ConsistentRead parameter to true and obtain a strongly consistent result. 
         * Global secondary indexes support eventually consistent reads only, so do not specify ConsistentRead when querying a global secondary index. */
        queryCommandInput['ConsistentRead'] = params.ConsistentRead;
    }
    if (params.ExpressionAttributeNames) {
        queryCommandInput['ExpressionAttributeNames'] = params.ExpressionAttributeNames;
    }
    if (params.ProjectionExpression) {
        queryCommandInput['ProjectionExpression'] = params.ProjectionExpression;
    }
    if (params.IndexName) {
        queryCommandInput['IndexName'] = params.IndexName;
    }
    if (params.FilterExpression) {
        queryCommandInput['FilterExpression'] = params.FilterExpression;
    }
    if (params.ExclusiveStartKey) {
        queryCommandInput['ExclusiveStartKey'] = params.ExclusiveStartKey;
    }
    if(params.ScanIndexForward !== undefined) {
        queryCommandInput['ScanIndexForward'] = params.ScanIndexForward;
    }
    const command = new QueryCommand(queryCommandInput);
    const response = await docClient.send(command);
    logger.debug(response);
    return response;
}

/**
 * Updates value in dynamodb table
 * @param {object} params 
 * @returns 
 */
async function updateItemToDb(params) {
    const updateCommandInput = {
        TableName: params.TableName,
        Key: params.Key,
        UpdateExpression: params.UpdateExpression,
        ExpressionAttributeValues: params.ExpressionAttributeValues,
        ReturnValues: "ALL_NEW",
    };
    if (params.ExpressionAttributeNames) {
        updateCommandInput['ExpressionAttributeNames'] = params.ExpressionAttributeNames;
    }
    if (params.ConditionExpression) {
        updateCommandInput['ConditionExpression'] = params.ConditionExpression;
    }
    if (params.ReturnValues) {
        updateCommandInput['ReturnValues'] = params.ReturnValues;
    }
    const command = new UpdateCommand(updateCommandInput);
    const response = await docClient.send(command);
    logger.debug(response);
    return response;
}

/**
 * Delete an entry from dynamodb table
 * @param {string} tableName 
 * @param {object} key 
 * @returns 
 */
async function deleteItemFromDb(tableName, key) {
    const command = new DeleteCommand({
        TableName: tableName,
        Key: key,
    });

    const response = await docClient.send(command);
    logger.debug(response);
    return response;
}

/**
 * Get batch of items from dynamodb
 * @param {object} params 
 * @returns 
 */
async function getItemsInBatchFromDb(params) {
    const batchCommandInput = {
        RequestItems: params.RequestItems
    }
    const command = new BatchGetCommand(batchCommandInput);

    const response = await docClient.send(command);
    logger.debug(response);
    return response;
}

/**
 * Scan items from dynamodb table
 * @param {object} params 
 * @returns 
 */
async function scanItemsFromDb(params) {
    const scanCommandInput = {
        TableName: params.TableName
    }
    if (params.ProjectionExpression) {
        scanCommandInput['ProjectionExpression'] = params.ProjectionExpression;
    }
    if (params.ExpressionAttributeNames) {
        scanCommandInput['ExpressionAttributeNames'] = params.ExpressionAttributeNames;
    }
    if (params.FilterExpression) {
        scanCommandInput['FilterExpression'] = params.FilterExpression;
    }
    if (params.ExpressionAttributeValues) {
        scanCommandInput['ExpressionAttributeValues'] = params.ExpressionAttributeValues;
    }
    if (params.ExclusiveStartKey) {
        scanCommandInput['ExclusiveStartKey'] = params.ExclusiveStartKey;
    }
    const command = new ScanCommand(scanCommandInput);

    const response = await docClient.send(command);
    logger.debug(response);
    return response;
}

async function transactWriteItems(params) {
    const transactItemsToWrite = {
        TransactItems: params.TransactItems
    }
    const command = new TransactWriteCommand(transactItemsToWrite);

    const response = await docClient.send(command);
    logger.debug(response);
    return response;
}

module.exports = {
    getItemFromDb,
    addItemToDb,
    queryItemFromDb,
    updateItemToDb,
    deleteItemFromDb,
    getItemsInBatchFromDb,
    scanItemsFromDb,
    transactWriteItems
}