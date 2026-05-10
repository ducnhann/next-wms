import { db } from "@wms/backend/auth/db";
import { user as userTable } from "@wms/backend/auth/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * GET /api/auth/email-status?email=...
 * Check if an email exists and its verification status
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { valid: false, message: "Email is required" },
      { status: 400 },
    );
  }

  try {
    const users = await db
      .select({
        id: userTable.id,
        email: userTable.email,
        emailVerified: userTable.emailVerified,
      })
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1);

    const user = users[0];

    if (!user) {
      return NextResponse.json({
        valid: false,
        verified: undefined,
        message: "User not found",
      });
    }

    return NextResponse.json({
      valid: true,
      verified: user.emailVerified,
      message: undefined,
    });
  } catch (error) {
    console.error("Error checking email status:", error);
    return NextResponse.json(
      { valid: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
