import { v } from "convex/values";
import { query } from "./_generated/server";

export const get = query({
  args: {},
  returns: v.object({ message: v.string() }),
  handler: async () => {
    return { message: "OK" };
  },
});
