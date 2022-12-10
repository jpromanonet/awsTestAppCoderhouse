/* Requerir las dependencias */

const express = require('express')
const AWS = require('aws-sdk')
const { AppStream, Redshift } = require('aws-sdk')
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
        .then(data => {
            console.log('Se notifico')
            console.log(data)

            const body = {
                Operation: 'SAVE',
                Message: "SUCCESS",
                Item: req.body
            }
            res.json(body);
        })
        .catch(error => {
            console.error('Ocurrio un error: ', error);
            res.status(500).end();
        })
})

app.put('/api/productos/:id', (req, res) => {
    const item = {
        ...req.body,
        productId: req.params.id
    }
    const params = {
        TableName: TABLE_NAME,
        Item: item
    }
    dynamodb.put(params).promise()
        .then(() => {
            const body = {
                Operation: 'UPDATE',
                Message: 'SUCCESS',
                Item: item
            }
            res.json(body);
        })
        .catch(error => {
            console.error('Ocurrio un error', error)
            res.sendStatus(500)
        })
})

