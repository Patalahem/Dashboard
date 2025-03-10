import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'amplifyTeamDrive',
  access: (allow) => ({
    'profile-pictures/{entity_id}/*': [
      allow.guest.to(['read', 'write', 'delete']), // Guests can now upload
      allow.authenticated.to(['read', 'write', 'delete']), // Authenticated users can upload
    ],
    'picture-submissions/*': [
      allow.guest.to(['read', 'write', 'delete']), // Guests can upload
      allow.authenticated.to(['read', 'write', 'delete']), // Authenticated users can upload
    ],
  }),
});
