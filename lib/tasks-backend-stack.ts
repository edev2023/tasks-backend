import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { TasksService } from './tasks-service';

export class TasksBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // The code that defines your stack goes here
    new TasksService(this, 'TasksService');
  }
}
