import { pusherServer } from "@/lib/pusher";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { roomId, word, isGuessed, speakerName, actionType } = await req.json();
  
  await pusherServer.trigger(`room-${roomId}`, "game-event", {
    actionType,
    word,
    isGuessed,
    speakerName
  });

  return NextResponse.json({ success: true });
}