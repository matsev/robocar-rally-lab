'use strict';

// https://github.com/aws/aws-iot-device-sdk-js
const thingShadow = require('aws-iot-device-sdk').thingShadow;
const os = require('os-utils');

const configPath = process.env.IOT_CONFIG_PATH || '/home/pi/certs/config.json'
const { Host, Port, Region, ClientId, ThingName, ThingTypeName, CaCert, ClientCert, PrivateKey } = require(configPath);

const HelloTopic = `${ThingTypeName}/hello`;
const ReportTopic = `${ThingTypeName}/${ThingName}`

function createTop(shadow) {
  const top = () => {
    const memPercentage = os.freememPercentage();
    os.cpuUsage((cpuPercentage) => {
      const mem = memPercentage * 100;
      const cpu = cpuPercentage * 100;
      const report = JSON.stringify({ cpu, mem });
      shadow.publish(ReportTopic, report);
      console.log(`${ThingName} published ${report} to '${HelloTopic}'`);
    });
  }
  return top;
}

function run() {

  const shadow = thingShadow({
    keyPath: PrivateKey,
    certPath: ClientCert,
    caPath: CaCert,
    clientId: ClientId,
    region: Region,
    host: Host,
    port: Port,
    debug: true
  });

  let interval = 0;

  shadow.on('connect', () => {
    console.log(`${ThingName} connected to https://${Host}:${Port}`);
    
    shadow.publish(HelloTopic, JSON.stringify({ Name: ThingName }));
    console.log(`${ThingName} published its name to '${HelloTopic}'`);

    const top = createTop(shadow);
    interval = setInterval(top, 1000);
  });

  shadow.on('close', () => {
    console.log('Stopping metric loop');
    clearInterval(interval);
    interval = 0;
  });

  shadow.on('error', (error) => {
    console.log('error', error);
  });

  shadow.on('delta', (thingName, stateObject) => {
    console.log(`received delta on ${thingName}:${JSON.stringify(stateObject)}`);
  });
 
  shadow.on('timeout', (thingName, clientToken) => {
    console.warn('timeout: ' + thingName + ', clientToken=' + clientToken);
  });
}

if (require.main === module) {
  run();
}