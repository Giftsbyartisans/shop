import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "shopFiles",
  access: (allow) => ({
    "media/*": [
      allow.guest.to(["read"]),
      allow.authenticated.to(["read"]),
      allow.groups(["Admins"]).to(["read", "write", "delete"]),
    ],
    "uploads/{entity_id}/*": [
      allow.entity("identity").to(["read", "write", "delete"]),
    ],
  }),
});
