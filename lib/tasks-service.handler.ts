import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
  Handler,
} from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLENAME;

const headerForCors = {
  'Access-Control-Allow-Headers':
    'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
}

const routeRequest = async (event: APIGatewayProxyEvent) => {
  const { body, httpMethod, pathParameters } = event;
  let response, command;
  if (pathParameters?.id) {
    const { id } = pathParameters;
    switch (httpMethod) {
      case 'GET':
        command = new GetCommand({
          TableName: tableName,
          Key: {
            id,
          },
          ConsistentRead: true,
        });
        response = await dynamo.send(command);
        console.log(response);
        return buildResponseBody(200, JSON.stringify(response.Item), headerForCors);
      case 'PUT':
        if (!body) {
          throw new Error(`body not found`);
        }
        const payload = JSON.parse(body);
        const set = Object.keys(payload)
          .map((p) => `#${p} = :${p}`)
          .join(',');
        const attributes = Object.entries(payload).reduce(
          (acc, [k, v]) => ({ ...acc, [`#${k}`]: k }),
          {}
        );
        const values = Object.entries(payload).reduce(
          (acc, [k, v]) => ({ ...acc, [`:${k}`]: v }),
          {}
        );
        command = new UpdateCommand({
          TableName: tableName,
          Key: {
            id,
          },
          UpdateExpression: `set ${set}`,
          ExpressionAttributeNames: attributes,
          ExpressionAttributeValues: values,
          ReturnValues: 'ALL_NEW',
        });
        response = await dynamo.send(command);
        console.log(response);
        return buildResponseBody(200, JSON.stringify(response.Attributes), headerForCors);
      case 'DELETE':
        command = new DeleteCommand({
          TableName: tableName,
          Key: {
            id,
          },
        });
        response = await dynamo.send(command);
        console.log(response);
        return buildResponseBody(204, JSON.stringify(true), headerForCors);
    }
  } else {
    switch (httpMethod) {
      case 'POST':
        if (!body) {
          throw new Error(`body not found`);
        }
        const id = Math.random().toString(16).substring(2);
        command = new PutCommand({
          TableName: tableName,
          Item: {
            ...JSON.parse(body),
            id,
          },
        });
        response = await dynamo.send(command);
        console.log(response);
        return buildResponseBody(201, JSON.stringify(true), headerForCors);
      case 'GET':
        command = new ScanCommand({
          TableName: tableName,
          ConsistentRead: true,
        });
        response = await dynamo.send(command);
        console.log(response);
        return buildResponseBody(200, JSON.stringify(response.Items), headerForCors);
    }
  }
  throw new Error(`Unimplemented HTTP method: ${httpMethod}`);
};

const buildResponseBody = (status: number, body: string, headers = {}) => {
  return {
    statusCode: status,
    headers,
    body,
  };
};

export const handler: Handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    return await routeRequest(event);
  } catch (err: any) {
    console.error(err);
    return buildResponseBody(
      500,
      JSON.stringify({
        message: err.message,
      })
    );
  }
};