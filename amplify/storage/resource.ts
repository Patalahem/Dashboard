import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "amplifyTeamDrive",
  access: (allow) => ({
    "uploads/{entity_id}/*": [
      allow.authenticated.to(["read", "write", "delete"]),
    ],
  }),
});

