import { NextResponse } from "next/server";

const rooms = new Map();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId");

  if (!roomId) return NextResponse.json({ error: "No roomId" }, { status: 400 });

  const state = rooms.get(roomId) || { players: [], teams: null, gameState: "setup" };
  return NextResponse.json(state);
}