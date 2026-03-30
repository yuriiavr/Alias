"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const router = useRouter();

  const createRoom = () => {
    const id = Math.random().toString(36).substring(2, 7).toUpperCase();
    router.push(`/room/${id}`);
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      router.push(`/room/${roomId.toUpperCase()}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] text-zinc-200 p-6 font-sans selection:bg-red-900/50">
      <main className="w-full max-w-sm space-y-16 text-center">
        <div className="space-y-3 cursor-default">
          <h1 className="text-6xl font-black tracking-tighter text-white uppercase italic">
            ALIAS<span className="text-red-700">AI</span>
          </h1>
          <div className="h-[2px] w-8 bg-red-800 mx-auto"></div>
          <p className="text-zinc-600 text-[10px] tracking-[0.4em] uppercase font-medium">
            Ultimate Party Game
          </p>
        </div>

        <div className="space-y-8">
          <button
            onClick={createRoom}
            className="w-full py-4 bg-zinc-100 hover:bg-white text-black rounded-xl font-bold text-lg transition-all active:scale-[0.97] shadow-sm cursor-pointer"
          >
            Створити нову гру
          </button>

          <div className="relative flex items-center justify-center">
            <div className="absolute w-full border-t border-zinc-900"></div>
            <span className="relative px-4 bg-[#0a0a0a] text-zinc-700 text-xs uppercase tracking-widest font-medium">
              або
            </span>
          </div>

          <form onSubmit={joinRoom} className="space-y-4">
            <input
              type="text"
              placeholder="Введіть код"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-4 py-4 bg-[#121212] border border-zinc-800 rounded-xl text-center text-lg font-mono focus:outline-none focus:border-red-900/50 transition-colors placeholder:text-zinc-800 uppercase text-red-600 tracking-widest"
            />
            <button
              type="submit"
              className="w-full py-3 text-zinc-500 hover:text-red-600 font-bold transition-colors text-xs uppercase tracking-[0.2em] cursor-pointer"
            >
              Приєднатися до сесії
            </button>
          </form>
        </div>

        <footer className="pt-8 cursor-default">
          <div className="inline-flex items-center gap-3 opacity-30">
            <div className="w-1.5 h-1.5 bg-red-800 rounded-full animate-pulse"></div>
            <span className="text-[9px] uppercase tracking-[0.5em] font-light">Ready to start</span>
          </div>
        </footer>
      </main>
    </div>
  );
}