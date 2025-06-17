const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const client = new SecretsManagerClient();

const { Logger } = require("/opt/nodejs/commons/logger");
const logger = new Logger(process.env.logLevel);

async function getValue(params) {
    const input = {
        SecretId: params.SecretId
    };
    if (params.VersionId) {
        input.VersionId = params.VersionId;
    }
    if (params.VersionStage) {
        input.VersionStage = params.VersionStage;
    }
    const command = new GetSecretValueCommand(input);
    const response = await client.send(command);
    logger.debug(response);
    return response;
}

module.exports = {
    getValue
}