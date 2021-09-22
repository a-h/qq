import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda-nodejs';
import * as path from 'path';
import { AttributeType, BillingMode } from '@aws-cdk/aws-dynamodb';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as logs from '@aws-cdk/aws-logs';

export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, "table", {
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "sk",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    const app = new lambda.NodejsFunction(this, "appFunction", {
      environment: {
        TABLE_NAME: table.tableName,
      },
      entry: path.join(__dirname, "../../lambda/handler.ts"),
      logRetention: logs.RetentionDays.ONE_MONTH,
    });
    table.grantReadWriteData(app);

    new apigateway.LambdaRestApi(this, 'api', {
      handler: app,
    });
  }
}
