// Import libraries
let ampq = require('amqplib');
let log4js = require("log4js");

// Import config
let RABBIT_SERVER = require("../config/integrations.config").RABBIT_SERVER;
let RABBIT_QUEUE = require("../config/integrations.config").RABBIT_QUEUE;
let RABBIT_SETTINGS_PERSISTENT = require("../config/integrations.config").RABBIT_SETTINGS_PERSISTENT;
let RABBIT_SETTINGS_DURABLE = require("../config/integrations.config").RABBIT_SETTINGS_DURABLE;
let RABBIT_SETTINGS_EXCLUSIVE = require("../config/integrations.config").RABBIT_SETTINGS_EXCLUSIVE;
let RABBIT_SETTINGS_AUTODELETE = require("../config/integrations.config").RABBIT_SETTINGS_AUTODELETE;

// Obtengo logger
let logger = log4js.getLogger('ServerScripts');

// Function to insert request to queue

class RabbitService {

  constructor(){}

  async sendRequestQueue(smsQueueItem){

    let connection;
    let status = true;

    try {
      // Rabbit process
      connection = await ampq.connect(RABBIT_SERVER);
      const channel = await connection.createChannel();

      await channel.assertQueue(RABBIT_QUEUE,
        {durable: RABBIT_SETTINGS_DURABLE,
         exclusive: RABBIT_SETTINGS_EXCLUSIVE,
         autoDelete: RABBIT_SETTINGS_AUTODELETE
      });

      channel.sendToQueue(RABBIT_QUEUE, Buffer.from(JSON.stringify(smsQueueItem)), {persistent: RABBIT_SETTINGS_PERSISTENT});
      await channel.close();

    } catch (error) {
      logger.error(error);
      status = false;
    } finally{
      if(connection){await connection.close()};
    }
    return status;
  }

}

module.exports = RabbitService;
