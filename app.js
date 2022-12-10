/* Requerir las dependencias */

const express = require('express')
const AWS = require('aws-sdk')
const { AppStream } = require('aws-sdk')
const { response } = require('express')

/* Configurar la región de AWS */
AWS.config.update({
    region: "us-east-1"
})

/* Configurar constantes de entorno de AWS */

/** Configurar topico SNS **/
const sns = new AWS.SNS()
const SNS_TOPIC_ARN = 'arn:aws:sns:us-east-2:164802116698:notificaciones'

/** Configurar DynamoDB **/
const dynamodb = AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'product-inventory';

/* Funciones del CRUD */
const app = express();
app.use(express.json());

/* Testeando la API */

app.get('/', (req, res) => {
    res.send("test API")
})

/* Traernos datos de la base completa o por ID */

app.get('/api/productos', async (req, res) => {
    const params = {
        TableName: TABLE_NAME
    }
    try {
        const productos = await scanDynamoRecords(params);
        res.json(productos)
    } catch (error) {
        console.error('Ocurrio un error: ', error);
        res.sendStatus(500);
    }
})

app.get('/api/productos/:id', (req, res) => {
    const params = {
        TableName: TABLE_NAME,
        Key: {
            'productId': req.params.id
        }
    }
    dynamodb.get(params).promise()
        .then(response => {
            res.json(response.Item);
        })
        .catch(error => {
            console.error('Ocurrio un error: ', error);
            res.sendStatus(500);
        })
})

/* Aca guardamos datos en DynamoDB */

app.post('/api/productos', (req, res) => {
    const params = {
        TableName: TABLE_NAME,
        Item: req.body
    }
    dynamodb.put(params).promise()
        .then(() => {
            console.log("Objeto guardado con exito")
            const prod = JSON.stringify(req.body)
            return sns.publish({
                Message: `Nuevo producto agregado: ${prod}`,
                Subject: 'Nuevo producto agreado!',
                TopicArn: SNS_TOPIC_ARN
            }).promise()
        })
})
