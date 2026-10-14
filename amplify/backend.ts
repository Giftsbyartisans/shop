import { Table, AttributeType, BillingMode } from "aws-cdk-lib/aws-dynamodb";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { HttpApi, HttpMethod, CorsHttpMethod, CfnStage } from 'aws-cdk-lib/aws-apigatewayv2';
import process from 'node:process';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { shopApi } from './functions/shop-api/resource';
import { defineBackend } from '@aws-amplify/backend';
import { Duration, Stack } from 'aws-cdk-lib';
import { CachePolicy, Distribution, Function as CloudFrontFunction, FunctionCode, FunctionEventType, ViewerProtocolPolicy, ResponseHeadersPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { auth } from './auth/resource';
import { recoverProductionPool } from './auth/recover-production-pool';
import { data } from './data/resource';
import { storage } from './storage/resource';

const backend = defineBackend({ auth, data, storage, shopApi });
recoverProductionPool(backend.auth.resources.cfnResources.cfnUserPool, backend.auth.resources.cfnResources.cfnUserPoolClient);
// Keep the distribution in the bucket's stack to avoid an OAC policy cycle.
const stack = Stack.of(backend.storage.resources.bucket);
const restrictMedia = new CloudFrontFunction(stack, 'StorefrontMediaOnly', {
  code: FunctionCode.fromInline(`function handler(event) {
    var request = event.request;
    if (!/^\\/media\\/[a-zA-Z0-9_\\-./]+$/.test(request.uri) || request.uri.indexOf('..') !== -1) {
      return { statusCode: 403, statusDescription: 'Forbidden' };
    }
    return request;
  }`),
});
const media = new Distribution(stack, 'StorefrontMedia', {
  defaultBehavior: {
    origin: S3BucketOrigin.withOriginAccessControl(backend.storage.resources.bucket),
    viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    responseHeadersPolicy: ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS,
    cachePolicy: new CachePolicy(stack, 'StorefrontMediaCache', {
      minTtl: Duration.seconds(0),
      defaultTtl: Duration.days(1),
      maxTtl: Duration.days(365),
    }),
    functionAssociations: [{ function: restrictMedia, eventType: FunctionEventType.VIEWER_REQUEST }],
  },
  errorResponses: [{ httpStatus: 403, ttl: Duration.seconds(0) }, { httpStatus: 404, ttl: Duration.seconds(0) }],
});
backend.addOutput({ custom: { mediaCdnUrl: `https://${media.distributionDomainName}` } });

const apiLambda = backend.shopApi.resources.lambda;
const verificationTable = new Table(backend.createStack('order-verification'), 'OrderVerification', {
  partitionKey: { name: 'id', type: AttributeType.STRING }, billingMode: BillingMode.PAY_PER_REQUEST,
  timeToLiveAttribute: 'expiresAt',
});
verificationTable.grantReadWriteData(apiLambda);
backend.shopApi.addEnvironment('VERIFICATION_TABLE', verificationTable.tableName);
backend.shopApi.addEnvironment('ORDER_EMAIL_FROM', process.env.ORDER_EMAIL_FROM ?? '');
apiLambda.addToRolePolicy(new PolicyStatement({ actions: ['ses:SendEmail'], resources: [
  Stack.of(apiLambda).formatArn({ service: 'ses', resource: 'identity', resourceName: process.env.ORDER_EMAIL_FROM || 'unconfigured' }),
] }));
backend.shopApi.addEnvironment('USER_POOL_ID', backend.auth.resources.userPool.userPoolId);
backend.shopApi.addEnvironment('USER_POOL_CLIENT_ID', backend.auth.resources.userPoolClient.userPoolClientId);
backend.shopApi.addEnvironment('PAYPAL_MODE', process.env.AWS_BRANCH === 'main' ? 'live' : 'sandbox');
backend.shopApi.addEnvironment('PAYPAL_ENCRYPTION_KEY', process.env.PAYPAL_ENCRYPTION_KEY ?? '');
backend.shopApi.addEnvironment('MEDIA_BUCKET', backend.storage.resources.bucket.bucketName);
backend.shopApi.addEnvironment('MEDIA_CDN_URL', `https://${media.distributionDomainName}`);
backend.storage.resources.bucket.grantWrite(apiLambda, 'media/listing-images/*');
for (const [model, variable] of [
  ['CustomerOrder', 'ORDER_TABLE'], ['ShippingAddress', 'ADDRESS_TABLE'],
  ['PaymentSettings', 'PAYMENT_SETTINGS_TABLE'], ['ShopSettings', 'SHOP_SETTINGS_TABLE'], ['Listing', 'LISTING_TABLE'],
]) {
  const table = backend.data.resources.tables[model];
  backend.shopApi.addEnvironment(variable, table.tableName);
  if (model === 'PaymentSettings' || model === 'CustomerOrder') table.grantReadWriteData(apiLambda);
  else table.grantReadData(apiLambda);
}
const httpApi = new HttpApi(backend.createStack('shop-http-api'), 'ShopHttpApi', {
  corsPreflight: {
    allowOrigins: ['*'], allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST, CorsHttpMethod.PUT],
    allowHeaders: ['Content-Type', 'Authorization', 'X-PayPal-Mode'], maxAge: Duration.hours(1),
  },
});
const integration = new HttpLambdaIntegration('ShopIntegration', apiLambda);
(httpApi.defaultStage!.node.defaultChild as CfnStage).defaultRouteSettings = {
  throttlingBurstLimit: 50, throttlingRateLimit: 25,
};
httpApi.addRoutes({ path: '/admin/paypal', methods: [HttpMethod.GET, HttpMethod.PUT], integration });
httpApi.addRoutes({ path: '/import-image', methods: [HttpMethod.POST], integration });
httpApi.addRoutes({ path: '/favicon', methods: [HttpMethod.GET], integration });
httpApi.addRoutes({ path: '/order-finder/code', methods: [HttpMethod.POST], integration });
httpApi.addRoutes({ path: '/order-finder/verify', methods: [HttpMethod.POST], integration });
httpApi.addRoutes({ path: '/order-finder', methods: [HttpMethod.POST], integration });
httpApi.addRoutes({ path: '/orders/{id}', methods: [HttpMethod.GET], integration });
httpApi.addRoutes({ path: '/orders', methods: [HttpMethod.GET, HttpMethod.POST], integration });
httpApi.addRoutes({ path: '/cart', methods: [HttpMethod.POST], integration });
// Keep the prior path for already-loaded frontend clients during deployment.
httpApi.addRoutes({ path: '/cart/quote', methods: [HttpMethod.POST], integration });
backend.addOutput({ custom: { backendApiUrl: httpApi.apiEndpoint } });
