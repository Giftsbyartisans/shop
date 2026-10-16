import "./customer-auth";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";

// Session checks and bearer-token APIs need user-pool tokens, not temporary AWS
// credentials. Storage and identity-pool operations obtain their own credentials.
// The provider retains Amplify's expiration checks and automatic token refresh;
// do not cache tokens here across sign-in, sign-out, or expiration.
export async function fetchTokenSession(options: { forceRefresh?: boolean } = {}) {
  const tokens = await cognitoUserPoolsTokenProvider.getTokens(options);
  return { tokens: tokens ?? undefined };
}
