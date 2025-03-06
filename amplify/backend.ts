import { defineBackend } from "@aws-amplify/backend";
import { storage } from './storage/resource';
import { auth } from "./auth/resource";
import { data } from "./data/resource";

defineBackend({
  auth,
  data,
  storage,
});
