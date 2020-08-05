const express = require('express');
const app = express();
const path = require('path');
var cors = require('cors')
const AccessToken = require('twilio').jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;
require('dotenv').config();

app.use(cors())

const MAX_ALLOWED_SESSION_DURATION = 14400;
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioApiKeySID = process.env.TWILIO_API_KEY_SID;
const twilioApiKeySecret = process.env.TWILIO_API_KEY_SECRET;


app.get('/token', (req, res) => {
  const { authenticatedId, roomName } = req.query;
  const token = new AccessToken(twilioAccountSid, twilioApiKeySID, twilioApiKeySecret, {
    ttl: MAX_ALLOWED_SESSION_DURATION,
  });
  token.identity = authenticatedId;
  const videoGrant = new VideoGrant({ room: roomName });
  token.addGrant(videoGrant);
  res.send(token.toJwt());
  console.log(`issued token for ${authenticatedId} in room ${roomName}`);
});

const meetingRouter = express.Router();

async function getRoomData (roomName) {
    return new Promise(function (resolve) {
        resolve({
            name: roomName,
            status: 'Future',
            locked: false,
        });
    });
}

meetingRouter.post('/log', async (req, res) => {
    const { authenticatedId, error} = req.body;
    console.log('meeting error log', authenticatedId, error);
    res.sendStatus(200);
});

meetingRouter.get('/:roomName', async (req, res) => {
    const roomName = req.params.roomName;
    const roomData = await getRoomData(roomName);
    if (!roomData) {
        return res.status(404).send('Room not found');
    }
    res.status(200).json({
        name: roomName,
        status: roomData.roomStatus || 'Future',
        locked: roomData.roomLocked || false,
    });
});

meetingRouter.post('/:roomName/complete', async (req, res) => {
    const roomName = req.params.roomName;
    const authenticatedId = req.body.authenticatedId;
    console.log('complete req', roomName, authenticatedId);

    const roomData = await getRoomData(roomName);
    if (!roomData) {
        return res.status(404).send('Room not found');
    }
    if (authenticatedId !== roomData.cognito_id) {
        return res.status(403).send('forbidden');
    }

    res.sendStatus(200);
});

meetingRouter.post('/:roomName/lock', async (req, res) => {
    const roomName = req.params.roomName;
    const authenticatedId = req.body.authenticatedId;
    const locked = !!req.body.locked;
    console.log('lock req', roomName, authenticatedId);

    const roomData = await getRoomData(roomName);
    if (!roomData) {
        return res.status(404).send('Room not found');
    }
    if (authenticatedId !== roomData.cognito_id) {
        return res.status(403).send('forbidden');
    }
});


app.use("/meeting",meetingRouter)

app.listen(8081, () => console.log('Token server running on 8081'));