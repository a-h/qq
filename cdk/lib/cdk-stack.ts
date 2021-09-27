import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda-nodejs';
import * as path from 'path';
import { AttributeType, BillingMode } from '@aws-cdk/aws-dynamodb';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as logs from '@aws-cdk/aws-logs';
import { Tracing } from '@aws-cdk/aws-lambda';

export interface StackProps extends cdk.StackProps {
  slackBotToken: string,
  slackSigningSecret: string,
};

export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: StackProps) {
    super(scope, id, props);

    if(!props.slackBotToken) {
      throw new Error("slackBotToken has not been set");
    }
    if(!props.slackSigningSecret) {
      throw new Error("slackSigningSecret has not been set");
    }

    const table = new dynamodb.Table(this, "questionsTable", {
      partitionKey: {
        name: "pk",
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
        QUESTIONS_TABLE_NAME: table.tableName,
        SLACK_BOT_TOKEN: props.slackBotToken,
        SLACK_SIGNING_SECRET: props.slackSigningSecret,
      },
      entry: path.join(__dirname, "../../lambda/handler.ts"),
      logRetention: logs.RetentionDays.ONE_MONTH,
      tracing: Tracing.ACTIVE,
    });
    table.grantReadWriteData(app);

    new apigateway.LambdaRestApi(this, 'api', {
      handler: app,
    });
  }
}
