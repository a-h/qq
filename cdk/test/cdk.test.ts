import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as Cdk from '../lib/cdk-stack';

describe('Question stack', () => {
  it("includes a table", () => {
    const app = new cdk.App();
    const stack = new Cdk.CdkStack(app, 'MyTestStack', {
      slackBotToken: "fake_token",
      slackSigningSecret: "fake_secret",
    });
    expectCDK(stack).to(haveResource("AWS::DynamoDB::Table", {}))
  });
});
