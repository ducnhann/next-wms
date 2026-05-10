import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run every day at 6:00 AM UTC+7 (Vietnam Time)
// 6:00 AM VN = 23:00 PM UTC (previous day)
crons.cron(
  "check-inventory-expiration",
  "0 23 * * *",
  internal.inventory.checkInventoryExpiration,
);

export default crons;
