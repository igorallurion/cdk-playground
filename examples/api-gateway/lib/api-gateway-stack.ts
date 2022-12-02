import * as cdk from "aws-cdk-lib";
import {
  Cors,
  MockIntegration,
  PassthroughBehavior,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

export class ApiGatewayStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const api = new RestApi(this, "RestApi", {
      restApiName: "Api Gateway Example 01 API",
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

    const proxyResouce = api.root.addResource("{proxy+}");
    proxyResouce.addMethod(
      "GET",
      new MockIntegration({
        integrationResponses: [
          {
            statusCode: "404",
            responseTemplates: {
              "application/json": `{"message": "Resource not found"}`,
            },
          },
        ],
        passthroughBehavior: PassthroughBehavior.WHEN_NO_MATCH,
        requestTemplates: {
          "application/json": '{ "statusCode": 404 }',
        },
      }),
      {
        methodResponses: [{ statusCode: "404" }],
      }
    );
  }
}
