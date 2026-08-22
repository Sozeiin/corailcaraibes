import { handleMarevoWebhook } from '../_shared/marevoWebhookHandler.ts';

Deno.serve((req) => handleMarevoWebhook(req));
