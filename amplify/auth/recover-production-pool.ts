import { Stack } from 'aws-cdk-lib';
import type { CfnUserPool, CfnUserPoolClient } from 'aws-cdk-lib/aws-cognito';

const affectedStack = 'amplify-d3r1sr91624ks6-main-branch-b045bbc189';

/**
 * The production pool us-east-1_kN18CFDrm was deleted outside CloudFormation.
 * New, permanent logical IDs let CloudFormation recreate the pool and client.
 * Keep these IDs after recovery; removing them would replace auth again.
 */
export function recoverProductionPool(pool: CfnUserPool, client: CfnUserPoolClient) {
  let root = Stack.of(pool);
  while (root.nestedStackParent) root = root.nestedStackParent;
  if (root.stackName !== affectedStack) return;
  pool.overrideLogicalId('ShopProductionUserPoolRecovery20261010');
  client.overrideLogicalId('ShopProductionUserPoolClientRecovery20261010');
}
