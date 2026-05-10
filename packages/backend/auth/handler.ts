import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "./index";

/**
 * Next.js API route handlers for Better Auth
 * Export these from your [...all]/route.ts file
 */
export const { GET, POST } = toNextJsHandler(auth);

/**
 * Re-export auth for use in server components/actions
 */
export { auth };
