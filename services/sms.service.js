// Importo librerías
let log4js = require("log4js");

// Importo funciones compartidas
let GenerateUUID = require('../shared/uuid.shared.js').GenerateUUID;

// Importo clase RabbitService
const RabbitService = require('../shared/rabbitmq.shared.js');
const service = new RabbitService();

// Import config
let SMS_QUEUE_STATUS = require("../config/integrations.config").SMS_QUEUE_STATUS;
let SMS_FAILED_STATUS = require("../config/integrations.config").SMS_FAILED_STATUS;

// Obtengo logger
let logger = log4js.getLogger('ServerScripts');

// Expongo la funcion
exports.SMSService = function(app) {

    app.post('/api/sms/enviarRabbit', async function(req, res) {

        // Escribo a log
        logger.info('Se recibió ' + req.method + ' para \'' + req.path + '\'');

        // Datos recibidos en el request
        let request = req.body || {};
        let statusRabbit;

        let uniqueId = GenerateUUID();
        let reason = "";
        let status = SMS_QUEUE_STATUS;

        // Validate request
        if(request.addresses){
          if(request.addresses.length == 0){
          //console.warn("El telefono es requerido");
          logger.error('El telofono es requerido');
          reason = "El telofono es requerido";
          status = SMS_FAILED_STATUS;
          }
        }

        if(!request.message){
          //console.warn("El mensaje es requerido");
          logger.error('El mensaje es requerido');
          reason = "El mensaje es requerido";
          status = SMS_FAILED_STATUS
        }

        // Declaro objetos a usar
        let response = {status : true,
          reason : reason,
          addresses : {}};

        if(status != SMS_FAILED_STATUS){

          let smsQueueItem = {id : "",
              message: request.message.text,
              addresses: request.addresses}

          statusRabbit = await service.sendRequestQueue(smsQueueItem);
        }

        for(var address of request.addresses){
          if(address){
            response.addresses[address] = {
              id: uniqueId,
              status: statusRabbit?SMS_QUEUE_STATUS:SMS_FAILED_STATUS,
              reason: "",
              phone: address
            }
          }
        }
        response.status = status==SMS_FAILED_STATUS?false:statusRabbit?true:false;

        res.json(response)
    });
}
