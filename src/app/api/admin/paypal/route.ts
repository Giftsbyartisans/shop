import { CognitoJwtVerifier } from "aws-jwt-verify";
import outputs from "../../../../../amplify_outputs.json";
import { automaticPayPalEnvironment, paypalSettingsSummary, updatePayPalSettings } from "@/lib/paypal-settings";
import { readPayPalSettings, writePayPalSettings } from "@/lib/server-paypal-settings";

const verifier = CognitoJwtVerifier.create({ userPoolId: outputs.auth.user_pool_id,
  clientId: outputs.auth.user_pool_client_id, tokenUse: "access", groups: ["Admins"] });
const headers = { "Cache-Control": "no-store" };
async function authorize(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) return false;
  try { await verifier.verify(token); return token; } catch { return false; }
}
export async function GET(request: Request) {
  const token = await authorize(request);
  if (!token) return Response.json({ error: "Admin sign-in required." }, { status: 401, headers });
  try { return Response.json(paypalSettingsSummary(await readPayPalSettings(token), automaticPayPalEnvironment(process.env.NODE_ENV)), { headers }); }
  catch { return Response.json({ error: "PayPal settings could not be loaded. Configure PAYPAL_ENCRYPTION_KEY and deploy the PaymentSettings backend model." }, { status: 503, headers }); }
}
export async function PUT(request: Request) {
  const token = await authorize(request);
  if (!token) return Response.json({ error: "Admin sign-in required." }, { status: 401, headers });
  let input: unknown;
  try {
    const text = await request.text();
    if (text.length > 8192) throw new Error();
    input = JSON.parse(text);
  } catch { return Response.json({ error: "Invalid PayPal settings request." }, { status: 400, headers }); }
  let current;
  try { current = await readPayPalSettings(token); }
  catch { return Response.json({ error: "PayPal credential storage is unavailable. Check the server configuration." }, { status: 503, headers }); }
  let settings;
  try { settings = updatePayPalSettings(current, input); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Invalid settings." }, { status: 400, headers }); }
  try {
    await writePayPalSettings(settings, token);
    return Response.json(paypalSettingsSummary(settings, automaticPayPalEnvironment(process.env.NODE_ENV)), { headers });
  } catch { return Response.json({ error: "PayPal settings could not be saved. Check server storage permissions." }, { status: 503, headers }); }
}
