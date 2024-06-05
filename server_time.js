/**
 * ------------- DISCLAIMER & WARNING and  -------------
 * This FUOTA test server should only be used for prototyping and testing.
 * This server should not be used in production.
 * Again, Please use this server for testing and prototyping only.
 * Please contact The Things Industries for scalable deployments.
 */

const mqtt = require('mqtt');
const gpsTime = require('gps-time');
const fs = require('fs');
const path = require('path');
const YAML = require('yaml')

//----------- Start of config area ----------------//
const config = YAML.parse(fs.readFileSync('./config.yaml', 'utf8'))

if (config.mqtt.key)
    config.mqtt.key = fs.readFileSync(path.join(__dirname, config.mqtt.key));
if (config.mqtt.cert)
    config.mqtt.cert = fs.readFileSync(path.join(__dirname, config.mqtt.cert));
var options = { ...config.mqtt, ...{
    // rejectUnauthorized: false,
}};

// Device IDs and EUIs config
var TENANT_ID = config.TENANT_ID;

// Script config
var extra_info = config.extra_info;

//----------- End of config area ----------------//

const client = mqtt.connect(options);

client.on('error', err => console.error('Error on MQTT subscriber', err));
client.on('connect', function () {
    console.log('MQTT client connected!');
    client.subscribe('v3/+/devices/+/up', function (err) { //subscribed to all topics
        if (err) {
            return console.error('Failed to subscribe', err);
        }
        console.log('Subscribed to all application events');
    });
});

client.on('message', async function (topic, message) {
    if (extra_info)
        console.log('msg', 'topic:', topic, JSON.parse(message.toString('utf-8')));
    // only interested in uplink messages
    if (!/\/up$/.test(topic)) return;


    // message is Buffer
    let m = JSON.parse(message.toString('utf-8'));
    let application_id = m.end_device_ids.application_ids.application_id;
    let device_id = m.end_device_ids.device_id;

    let msgWaiting = undefined;

    if (m.uplink_message.f_port === 202 /* clock sync */) {
        let body = Buffer.from(m.uplink_message.frm_payload, 'base64');
        if (body[0] === 0x1 /* CLOCK_APP_TIME_REQ */) {
            let deviceTime = body[1] + (body[2] << 8) + (body[3] << 16) + (body[4] << 24);
            let received_at = gpsTime.toGPSMS(new Date(m.uplink_message.settings.time)) / 1000 | 0;
            console.log('deviceTime', deviceTime, 'received_at', received_at, "token", body[5] & 0x0F);

            let adjust = received_at - deviceTime | 0;
            let token = body[5];
            let resp = Buffer.allocUnsafe(6);
            resp[0] = 1;
            resp.writeInt32LE(adjust, 1);
            resp[5] = token & 0x0F;
            let responseMessage = {
                "downlinks": [{
                    "priority": "NORMAL",
                    "f_port": 202,
                    "frm_payload": resp.toString('base64')
                }]
            };

            msgWaiting = responseMessage;

            console.log('Clock sync for device', m.end_device_ids.device_id, adjust, 'seconds');
        }
        else {
            console.warn('Could not handle clock sync request', body);
        }
    }
    if (msgWaiting) {
        console.log("publishing as", application_id+'@'+TENANT_ID, device_id);
        client.publish(`v3/${application_id+'@'+TENANT_ID}/devices/${device_id}/down/push`, Buffer.from(JSON.stringify(msgWaiting), 'utf8'));
    }
});
