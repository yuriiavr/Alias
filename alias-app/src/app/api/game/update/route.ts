import { pusherServer } from "@/lib/pusher";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { roomId, word, isGuessed } = await req.json();
  
  await pusherServer.trigger(`room-${roomId}`, "word-updated", {
    word: word,
    isGuessed
  });

  return NextResponse.json({ success: true });
}