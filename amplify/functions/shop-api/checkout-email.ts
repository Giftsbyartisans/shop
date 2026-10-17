import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import { checkoutEmail } from '../../../src/lib/checkout-contact';
const cognito = new CognitoIdentityProviderClient({});

export async function registeredCheckoutEmail(value: unknown) {
  const email = checkoutEmail(value);
  const result = await cognito.send(new ListUsersCommand({
    UserPoolId: process.env.USER_POOL_ID,
    Filter: `email = ${JSON.stringify(email)}`,
    Limit: 1,
  }));
  return Boolean(result.Users?.length);
}
