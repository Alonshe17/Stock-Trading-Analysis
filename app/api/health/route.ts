/**
 * Health Check API Route
 *
 * GET /api/health — Returns { status: "ok", timestamp: "..." }
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "API is running!",
  });
}
