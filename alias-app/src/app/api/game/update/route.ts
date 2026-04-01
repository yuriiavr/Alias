import { pusherServer } from "@/lib/pusher";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { roomId, actionType, ...data } = await req.json();
  
  await pusherServer.trigger(`room-${roomId}`, "game-event", {
    actionType,
    ...data
  });

  return NextResponse.json({ success: true });
}