import { defineFunction } from "@aws-amplify/backend";
export const shopApi = defineFunction({
  name: "shop-api", entry: "./handler.ts", timeoutSeconds: 30, memoryMB: 512,
  resourceGroupName: "data",
});
