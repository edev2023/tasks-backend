import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export class TasksService extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    
    const dynamo = new dynamodb.Table(this, 'database', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
    });

    const handler = new NodejsFunction(this, 'handler', {
      environment: {
        TABLENAME: dynamo.tableName,
      },
    });

    dynamo.grantReadWriteData(handler);

    const api = new apigateway.RestApi(this, 'api', {
      restApiName: 'Tasks Management',
      description: 'This service serves tasks management.',
    });

    const tasksHandler = new apigateway.LambdaIntegration(handler, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
    });
    api.root.addMethod('GET', tasksHandler);
    api.root.addMethod('POST', tasksHandler);
    const item = api.root.addResource('{id}');
    item.addMethod('GET', tasksHandler);
    item.addMethod('PUT', tasksHandler);
    item.addMethod('DELETE', tasksHandler);
  }

}