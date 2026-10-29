// Vercel BotID (free basic check): an invisible check on the lead form's request, no CAPTCHA, no extra account.
// The server reads the result in src/app/api/lead/route.ts. A suspected bot is flagged there, never dropped.
import { initBotId } from "botid/client/core";

initBotId({
  protect: [{ path: "/api/lead", method: "POST" }],
});
