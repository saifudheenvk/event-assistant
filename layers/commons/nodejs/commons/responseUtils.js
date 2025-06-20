const STATUS_CODES = {
    "OK" : 200,
    "CREATED" : 201,
    "NO_CONTENT": 204,
    "BAD_REQUEST" : 400,
    "UNAUTHORIZED" : 401,
    "FORBIDDEN" : 403,
    "NOT_FOUND" : 404,
    "METHOD_NOT_ALLOWED": 405,
    "INVALID_REQUEST":406,
    "SERVICE_UNAVAILABLE":503,
    "INTERNAL_SERVER_ERROR" :500,
    "HTTP_STATUS_CODE_UNPROCESSABLE_ENTITY":422
};


function createSuccessResponse(responseBody, statusCode, headers) {
    let response = {
        "body": responseBody === undefined ? "" : JSON.stringify(responseBody),
        "statusCode": statusCode ? statusCode : STATUS_CODES.OK,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Methods": "DELETE,GET,HEAD,PATCH,POST,PUT,OPTIONS",
            "cache-control": "max-age=0"
            }
    };
    response.headers = {...response.headers, ...headers};
    return response;
}

function ErrorResponse(requestId,  statusCode, code, message) {
    this.requestId = requestId;
    this.statusCode = statusCode ? statusCode : STATUS_CODES.NOT_FOUND;
    this.code = code;
    this.message = message;
}
ErrorResponse.prototype = new Error();

function createErrorResponse(requestId, statusCode, code, message, extraInfo, headers) {
    let error = new ErrorResponse(requestId, statusCode, code, message);
    if (extraInfo) {
        delete extraInfo.knownError;
        error = {...error, ...extraInfo};
    }
    let returnData = {
        "body": JSON.stringify(error),
        "statusCode": statusCode ?
            statusCode : error.statusCode ?
                error.statusCode : STATUS_CODES.NOT_FOUND,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Methods": "DELETE,GET,HEAD,PATCH,POST,PUT,OPTIONS",
            "cache-control": "max-age=0"
          }
    };
    if(headers)
        returnData.headers = {...returnData.headers, ...headers};
    return returnData;
}

exports.STATUS_CODES = STATUS_CODES;
exports.createSuccessResponse = createSuccessResponse;
exports.createErrorResponse = createErrorResponse;