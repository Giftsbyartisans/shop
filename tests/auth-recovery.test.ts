import assert from 'node:assert/strict';
import test from 'node:test';
import { App, NestedStack, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CfnUserPool, CfnUserPoolClient, CfnUserPoolGroup } from 'aws-cdk-lib/aws-cognito';
import { recoverProductionPool } from '../amplify/auth/recover-production-pool';

function synthesize(stackName: string) {
  const app = new App();
  const root = new Stack(app, 'Root', { stackName });
  const auth = new NestedStack(root, 'Auth');
  const pool = new CfnUserPool(auth, 'Pool');
  const client = new CfnUserPoolClient(auth, 'Client', { userPoolId: pool.ref });
  new CfnUserPoolGroup(auth, 'Admins', { groupName: 'Admins', userPoolId: pool.ref });
  recoverProductionPool(pool, client);
  return Template.fromStack(auth).toJSON().Resources;
}
test('production recovery creates new pool and client IDs and reconnects group and client references', () => {
  const resources = synthesize('amplify-d3r1sr91624ks6-main-branch-b045bbc189');
  const poolId = 'ShopProductionUserPoolRecovery20261010';
  assert.equal(resources[poolId].Type, 'AWS::Cognito::UserPool');
  assert.deepEqual(resources.ShopProductionUserPoolClientRecovery20261010.Properties.UserPoolId, { Ref: poolId });
  const group = Object.values(resources as Record<string, { Type: string; Properties: { UserPoolId: unknown } }>).find(value => value.Type === 'AWS::Cognito::UserPoolGroup');
  assert.ok(group);
  assert.deepEqual(group.Properties.UserPoolId, { Ref: poolId });
});
test('sandbox and other production stacks retain their auth identities', () => {
  for (const name of ['amplify-shopstarter-khushj-sandbox', 'amplify-other-main-branch']) {
    const resources = synthesize(name);
    assert.equal(resources.ShopProductionUserPoolRecovery20261010, undefined);
    assert.equal(resources.ShopProductionUserPoolClientRecovery20261010, undefined);
  }
});
