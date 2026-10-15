import { test } from "node:test";
import assert from "node:assert/strict";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
process.env.USER_POOL_ID = "us-east-1_testpool";
process.env.USER_POOL_CLIENT_ID = "testclient";
function event(path: string, method: string, body = ""): APIGatewayProxyEventV2 {
  return { rawPath: path, headers: {}, body, requestContext: { http: { method } } } as APIGatewayProxyEventV2;
}
test("Lambda requires admin tokens before reading or changing payment settings or importing photos", async () => {
  const { handler } = await import("../amplify/functions/shop-api/handler");
  assert.equal((await handler(event("/orders", "POST", "{}"))).statusCode, 400);
  assert.equal((await handler(event("/orders", "GET"))).statusCode, 401);
  assert.equal((await handler(event("/orders/order-id", "GET"))).statusCode, 401);
  for (const [path, method] of [["/admin/orders", "GET"], ["/admin/orders/order-id", "PUT"], ["/admin/paypal", "GET"], ["/admin/paypal", "PUT"], ["/import-image", "POST"]]) {
    const response = await handler(event(path, method));
    assert.equal(response.statusCode, 401);
    assert.equal(JSON.parse(response.body).error, "Admin sign-in required.");
  }
});
test("Lambda rejects unsupported routes and malformed cart requests", async () => {
  const { handler } = await import("../amplify/functions/shop-api/handler");
  assert.equal((await handler(event("/unknown", "GET"))).statusCode, 404);
  assert.equal((await handler(event("/order-finder", "POST", JSON.stringify({ trackingNumber: "invalid" })))).statusCode, 400);
  assert.equal((await handler(event("/cart", "POST", JSON.stringify({ items: [{ id: "p", quantity: -1 }] })))).statusCode, 400);
  assert.equal((await handler(event("/cart", "POST", JSON.stringify({ items: Array(101).fill({ id: "p", quantity: 1 }) })))).statusCode, 400);
});
