import * as cdk from "aws-cdk-lib";
import { Duration } from "aws-cdk-lib";
import {
  Cors,
  IAuthorizer,
  IdentitySource,
  IResource,
  MockIntegration,
  PassthroughBehavior,
  RequestAuthorizer,
  ResponseType,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { join } from "path";

type ApiGatewayStackProps = cdk.StackProps & {
  allowedOrigins: string[];
};

export class ApiGatewayStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    { allowedOrigins, ...props }: ApiGatewayStackProps
  ) {
    super(scope, id, props);

    const api = new RestApi(this, "RestApi", {
      restApiName: "Api Gateway Example 01 API",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowOrigins: allowedOrigins,
        allowMethods: Cors.ALL_METHODS,
      },
    });

    // api.addGatewayResponse("MissingAuthenticationResponse", {
    //   type: ResponseType.MISSING_AUTHENTICATION_TOKEN,
    //   statusCode: "401",
    //   responseHeaders: {
    //     "Access-Control-Allow-Origin": "*",
    //   },
    // });

    api.addGatewayResponse("UnauthorizedResponse", {
      type: ResponseType.UNAUTHORIZED,
      statusCode: "403",
      responseHeaders: {
        "Access-Control-Allow-Origin": "*",
      },
      // templates: {
      //   "application/json":
      //     '{ "message": $context.authMessage, "statusCode": $context.authStatusCode }',
      // },
    });

    const authorizerLambda = new lambda.Function(this, "Authorizer", {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "index.handler",
      code: this.createInlineAuthorizerCode(),
    });

    const authorizer = new RequestAuthorizer(this, "custom-authorizer", {
      handler: authorizerLambda,
      identitySources: [IdentitySource.header("Authorization")],
      resultsCacheTtl: Duration.seconds(0),
    });

    this.createMockedMethod(api.root, "GET", allowedOrigins, authorizer);

    this.createResourceNotFoundHandler(api.root);
  }

  private createInlineAuthorizerCode(): cdk.aws_lambda.Code {
    return lambda.Code.fromAsset(join(__dirname, "authorizer"));
  }

  private createResourceNotFoundHandler(baseResource: IResource) {
    const proxyResouce = baseResource.addResource("{proxy+}");
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

  private createMockedMethod(
    resource: IResource,
    method: string,
    allowedOrigins: string[],
    authorizer?: IAuthorizer
  ) {
    const integrationResponseParams =
      this.createIntegrationResponse(allowedOrigins);
    const methodResponseParams: { [p: string]: boolean } = {};
    for (const key of Object.keys(integrationResponseParams)) {
      methodResponseParams[key] = true;
    }

    const responseTemplateHeaders =
      this.createCorsResponseTemplateHeaders(allowedOrigins);
    const jsonResponseTemplate = [`{"message":"Hello World!"}`];
    if (responseTemplateHeaders) {
      jsonResponseTemplate.unshift(responseTemplateHeaders);
    }

    resource.addMethod(
      method,
      new MockIntegration({
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": jsonResponseTemplate.join("\n"),
            },
            responseParameters: integrationResponseParams,
          },
        ],
        passthroughBehavior: PassthroughBehavior.NEVER,
        requestTemplates: {
          "application/json": '{ "statusCode": 200 }',
        },
      }),
      {
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: methodResponseParams,
          },
        ],
        authorizer,
      }
    );
  }

  private createCorsHeaders(allowedOrigins: string[]): Record<string, string> {
    const initialOrigin = allowedOrigins[0];

    const headers: Record<string, string> = {
      "Access-Control-Allow-Headers":
        "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
      "Access-Control-Allow-Methods":
        "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'",
      "Access-Control-Allow-Origin": initialOrigin
        ? initialOrigin.startsWith("http")
          ? `'${initialOrigin}'`
          : `'https://${initialOrigin}'`
        : `'*'`,
    };

    if (initialOrigin !== "*") {
      headers["Vary"] = "'Origin'";
    }

    return headers;
  }

  createIntegrationResponse(allowedOrigins: string[]) {
    const integrationResponseParams: Record<string, string> = {};
    const headers = this.createCorsHeaders(allowedOrigins);

    for (const [name, value] of Object.entries(headers)) {
      const key = `method.response.header.${name}`;
      integrationResponseParams[key] = value;
    }

    return integrationResponseParams;
  }

  createCorsResponseTemplateHeaders(allowedOrigins: string[]) {
    if (allowedOrigins.length === 1) {
      return undefined;
    }

    const template = new Array<string>();

    template.push('#set($origin = $input.params().header.get("Origin"))');
    template.push(
      '#if($origin == "") #set($origin = $input.params().header.get("origin")) #end'
    );

    const condition = allowedOrigins
      .map((o) => `$origin.endsWith("${o}")`)
      .join(" || ");

    template.push(`#if(${condition})`);
    template.push(
      "  #set($context.responseOverride.header.Access-Control-Allow-Origin = $origin)"
    );
    template.push("#end");

    return template.join("\n");
  }
}
