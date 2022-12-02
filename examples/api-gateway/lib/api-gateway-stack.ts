import * as cdk from "aws-cdk-lib";
import {
  MockIntegration,
  PassthroughBehavior,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

export class ApiGatewayStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const api = new RestApi(this, "RestApi", {
      deployOptions: {
        stageName: "dev",
      },
    });

    api.root.addMethod(
      "GET",
      new MockIntegration({
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": `{"message": "Hello World!"}`,
            },
          },
        ],
        passthroughBehavior: PassthroughBehavior.NEVER,
        requestTemplates: {
          "application/json": '{ "statusCode": 200 }',
        },
      }),
      {
        methodResponses: [{ statusCode: "200" }],
      }
    );
  }
}
