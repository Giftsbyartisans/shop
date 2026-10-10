import { defineBackend } from '@aws-amplify/backend';
import { Duration, Stack } from 'aws-cdk-lib';
import { CachePolicy, Distribution, Function as CloudFrontFunction, FunctionCode, FunctionEventType, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';

const backend = defineBackend({ auth, data, storage });
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
