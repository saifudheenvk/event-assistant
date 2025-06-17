const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");


async function sendEmail(toArray, ccArray, subject, body) {
    const ses = new SESClient({ region: 'us-east-1' });
    const command = new SendEmailCommand({
        Source: 'vksaifudheen4@gmail.com',
        Destination: {
            ToAddresses: toArray,
            CcAddresses: ccArray,
        },
        Message: {
            Subject: {
                Data: subject,
            },
            Body: {
                Html: {
                    Data: body,
                    Charset: 'UTF-8',
                },
            },
        },
    });
    const response = await ses.send(command);
    logger.info(`Email sent successfully to ${toArray.join(', ')}`);
    return response;
}

module.exports = {
    sendEmail,
}