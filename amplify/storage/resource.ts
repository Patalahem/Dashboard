import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "amplifyTeamDrive",
  access: (allow) => ({
    // Access for uploading original files
    "uploads/{entity_id}/*": [allow.authenticated.to(["read", "write", "delete"])],

    // Access for reading processed results
    "processed/*": [allow.authenticated.to(["read", "delete"])],
  }),
});
