"use client";

import { useState, useEffect, use } from "react";
import { useSearchParams } from "next/navigation";
import AliasCard from "@/components/AliasCard";
import Pusher from "pusher-js";

interface Player {
  name: string;
  team: number;
  isSpectator: boolean;
  isCreator: boolean;
}

export default function GameRoom({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.id;
  const searchParams = useSearchParams();

  const [userName, setUserName] = useState("");
  const [userTeam, setUserTeam] = useState<number>(0);
  const [isSpectator, setIsSpectator] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<"setup" | "playing" | "results" | "final">("setup");
  const [difficulty, setDifficulty] = useState(searchParams.get("level") || "mixed");
  const [totalRounds, setTotalRounds] = useState(3);
  const [currentRound, setCurrentRound] = useState(1);
  const [timer, setTimer] = useState(60);
  const [isActive, setIsActive] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);

  const [teams, setTeams] = useState([
    { name: "Alpha Team", score: 0 },
    { name: "Bravo Team", score: 0 },
  ]);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [wordsQueue, setWordsQueue] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const canControl = isCreator || userName === currentSpeaker;
  const isNextSpeaker = players.filter((p) => p.team === currentTeamIndex)[0]?.name === userName;
  const canStartGame = isCreator || isNextSpeaker;

  useEffect(() => {
    const fetchCurrentState = async () => {
      try {
        const res = await fetch(`/api/game/state?roomId=${roomId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.players) setPlayers(data.players);
          if (data.teams) setTeams(data.teams);
          if (data.difficulty) setDifficulty(data.difficulty);
          if (data.totalRounds) setTotalRounds(data.totalRounds);
          if (data.currentRound) setCurrentRound(data.currentRound);
          if (data.currentTeamIndex !== undefined) setCurrentTeamIndex(data.currentTeamIndex);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchCurrentState();
  }, [roomId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else if (timer === 0 && isActive) {
      setIsActive(false);
      setGameState("results");
      fetch("/api/game/update", {
        method: "POST",
        body: JSON.stringify({ roomId, actionType: "END_TURN" }),
      });
    }
    return () => clearInterval(interval);
  }, [isActive, timer, roomId]);

  useEffect(() => {
    const saved = localStorage.getItem(`alias-session-${roomId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      setUserName(parsed.userName);
      setUserTeam(parsed.userTeam);
      setIsSpectator(parsed.isSpectator);
      setIsCreator(parsed.isCreator);
      setHasJoined(true);
    }
  }, [roomId]);

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe(`room-${roomId}`);

    channel.bind("game-event", (data: any) => {
      if (data.actionType === "SYNC_STATE") {
        if (data.players) setPlayers(data.players);
        if (data.teams) setTeams(data.teams);
        if (data.currentRound) setCurrentRound(data.currentRound);
        if (data.totalRounds) setTotalRounds(data.totalRounds);
        if (data.difficulty) setDifficulty(data.difficulty);
        if (data.currentTeamIndex !== undefined) setCurrentTeamIndex(data.currentTeamIndex);
      }
      if (data.actionType === "START_GAME") {
        setWordsQueue(data.words);
        setCurrentSpeaker(data.speakerName);
        setGameState("playing");
        setIsActive(true);
        setTimer(60);
      }
      if (data.actionType === "WORD_UPDATE") {
        setTeams(data.newTeams);
        setWordsQueue((prev) => prev.slice(1));
      }
      if (data.actionType === "END_TURN") {
        setGameState("results");
        setIsActive(false);
      }
    });

    return () => {
      pusher.unsubscribe(`room-${roomId}`);
    };
  }, [roomId]);

  const joinRoom = async (mode: "player" | "spectator", team: number = 0) => {
    if (!userName.trim()) return;

    let latestPlayers = players;
    try {
      const res = await fetch(`/api/game/state?roomId=${roomId}`);
      if (res.ok) {
        const data = await res.json();
        latestPlayers = data.players || [];
      }
    } catch (e) {}

    const isSpec = mode === "spectator";
    const creatorStatus = latestPlayers.length === 0;

    const newPlayer = {
      name: userName,
      team: isSpec ? -1 : team,
      isSpectator: isSpec,
      isCreator: creatorStatus,
    };

    const updatedPlayers = [...latestPlayers, newPlayer];

    localStorage.setItem(
      `alias-session-${roomId}`,
      JSON.stringify({
        userName,
        userTeam: team,
        isSpectator: isSpec,
        isCreator: creatorStatus,
      })
    );

    await fetch("/api/game/update", {
      method: "POST",
      body: JSON.stringify({
        roomId,
        actionType: "SYNC_STATE",
        players: updatedPlayers,
      }),
    });

    setHasJoined(true);
    setIsSpectator(isSpec);
    setUserTeam(team);
    setIsCreator(creatorStatus);
    setPlayers(updatedPlayers);
  };

  const updateSettings = async (updates: any) => {
    if (!isCreator) return;
    await fetch("/api/game/update", {
      method: "POST",
      body: JSON.stringify({
        roomId,
        actionType: "SYNC_STATE",
        ...updates,
      }),
    });
  };

  const startGame = async () => {
    setLoading(true);
    const res = await fetch("/api/words", {
      method: "POST",
      body: JSON.stringify({ difficulty, excludedWords: usedWords }),
    });
    const { words } = await res.json();

    const teamPlayers = players.filter((p) => p.team === currentTeamIndex);
    const speaker = teamPlayers[0]?.name || userName;

    await fetch("/api/game/update", {
      method: "POST",
      body: JSON.stringify({
        roomId,
        actionType: "START_GAME",
        words,
        speakerName: speaker,
      }),
    });
    setLoading(false);
  };

  const handleNextWord = async (guessed: boolean) => {
    const newTeams = [...teams];
    newTeams[currentTeamIndex].score += guessed ? 1 : -1;

    await fetch("/api/game/update", {
      method: "POST",
      body: JSON.stringify({
        roomId,
        actionType: "WORD_UPDATE",
        isGuessed: guessed,
        newTeams,
      }),
    });
  };

  const handleNextTurn = async () => {
    let nextTeam = currentTeamIndex === 0 ? 1 : 0;
    let nextRound = currentRound;

    if (currentTeamIndex === 1) {
      if (currentRound >= totalRounds) {
        setGameState("final");
        return;
      }
      nextRound++;
    }

    await fetch("/api/game/update", {
      method: "POST",
      body: JSON.stringify({
        roomId,
        actionType: "SYNC_STATE",
        currentTeamIndex: nextTeam,
        currentRound: nextRound,
      }),
    });
    setGameState("setup");
    setCurrentSpeaker(null);
  };

  if (!hasJoined) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-[#050505] p-6 text-white font-sans">
        <div className="w-full max-w-sm space-y-12 animate-in fade-in duration-700">
          <header className="text-center space-y-4">
            <h1 className="text-6xl font-black italic uppercase tracking-tighter">
              ALIAS<span className="text-red-700">AI</span>
            </h1>
            <div className="h-1 w-12 bg-red-700 mx-auto"></div>
            <span className="w-full text-red-700 py-4 font-bold text-[10px] uppercase tracking-[0.3em] transition-all">
              {roomId}
            </span>
          </header>

          <div className="space-y-6">
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="ЯК ТЕБЕ ЗВАТИ?"
              className="w-full px-6 py-5 bg-zinc-900 border border-zinc-800 rounded-2xl outline-none focus:border-red-700 transition-all font-black text-center tracking-widest"
            />

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => joinRoom("player", 0)}
                className="group relative py-5 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden transition-all hover:border-red-900"
              >
                <span className="relative z-10 font-black text-[10px] uppercase tracking-widest">
                  Команда 1
                </span>
                <div className="absolute inset-0 bg-red-900/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
              <button
                onClick={() => joinRoom("player", 1)}
                className="group relative py-5 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden transition-all hover:border-red-900"
              >
                <span className="relative z-10 font-black text-[10px] uppercase tracking-widest">
                  Команда 2
                </span>
                <div className="absolute inset-0 bg-red-900/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
            </div>

            <button
              onClick={() => joinRoom("spectator")}
              className="w-full py-4 text-zinc-600 hover:text-zinc-400 font-bold text-[10px] uppercase tracking-[0.3em] transition-all"
            >
              Увійти як глядач
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen bg-[#050505] p-6 text-zinc-300 font-sans overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-900/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-zinc-900/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {gameState === "setup" && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <header className="text-center">
              <h1 className="text-5xl font-black tracking-tighter text-white italic uppercase leading-none">
                ALIAS<span className="text-red-700">AI</span>
              </h1>
              <p className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase font-bold mt-3">
                Раунд {currentRound}/{totalRounds}
              </p>
              <span className="w-full text-red-700 py-4 font-bold text-[10px] uppercase tracking-[0.3em] transition-all">
                {roomId}
              </span>
            </header>

            <div className="bg-zinc-900/20 backdrop-blur-3xl border border-zinc-800/40 p-8 rounded-[2.5rem] space-y-6">
              {currentRound === 1 && usedWords.length === 0 ? (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-black ml-1">
                      Назви команд
                    </label>
                    {teams.map((team, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={team.name}
                        disabled={!isCreator}
                        onChange={(e) => {
                          const newTeams = [...teams];
                          newTeams[idx].name = e.target.value;
                          setTeams(newTeams);
                          updateSettings({ teams: newTeams });
                        }}
                        className={`w-full px-5 py-4 bg-black/40 border border-zinc-800 rounded-2xl focus:border-red-800/50 transition-all outline-none text-white font-bold ${
                          !isCreator && "opacity-50 cursor-not-allowed"
                        }`}
                      />
                    ))}
                  </div>

                  <div className="space-y-3">
                    <label className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-black ml-1">
                      Складність
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {["easy", "mixed", "medium", "hard"].map((lvl) => (
                        <button
                          key={lvl}
                          disabled={!isCreator}
                          onClick={() => {
                            setDifficulty(lvl);
                            updateSettings({ difficulty: lvl });
                          }}
                          className={`py-3 rounded-xl text-[9px] uppercase font-black transition-all border ${
                            difficulty === lvl
                              ? "bg-zinc-100 text-black"
                              : "bg-transparent text-zinc-600 border-zinc-800"
                          } ${!isCreator && "opacity-50"}`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-black ml-1">
                      Раундів
                    </label>
                    <div className="flex gap-2">
                      {[3, 5, 10].map((num) => (
                        <button
                          key={num}
                          disabled={!isCreator}
                          onClick={() => {
                            setTotalRounds(num);
                            updateSettings({ totalRounds: num });
                          }}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border ${
                            totalRounds === num
                              ? "bg-white text-black"
                              : "border-zinc-800 text-zinc-600"
                          } ${!isCreator && "opacity-50"}`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-800/50">
                    <label className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-black ml-1 block mb-3">
                      Гравці у лобі
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {players.map((p, i) => (
                        <div
                          key={i}
                          className="px-3 py-1.5 bg-zinc-800/50 rounded-lg border border-zinc-700/50 flex items-center gap-2"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.team === 0
                                ? "bg-blue-500"
                                : p.team === 1
                                ? "bg-red-500"
                                : "bg-zinc-500"
                            }`}
                          ></span>
                          <span className="text-[10px] font-bold text-white uppercase">
                            {p.name} {p.isCreator && "👑"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
                    Зараз черга
                  </span>
                  <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mt-1">
                    {teams[currentTeamIndex].name}
                  </h2>
                </div>
              )}
            </div>

            {canStartGame ? (
              <button
                onClick={startGame}
                disabled={loading}
                className="w-full py-5 bg-red-700 hover:bg-red-600 text-white rounded-2xl font-black text-lg tracking-widest transition-all shadow-[0_20px_50px_-10px_rgba(185,28,28,0.4)] disabled:opacity-50"
              >
                {loading ? "ГЕНЕРУЄМО..." : "ПОЧАТИ ГРУ"}
              </button>
            ) : (
              <div className="text-center p-6 border border-dashed border-zinc-800 rounded-2xl opacity-50">
                <p className="text-[10px] uppercase font-bold tracking-widest">
                  Чекаємо, поки {players.find(p => p.team === currentTeamIndex)?.name || "спікер"} почне гру...
                </p>
              </div>
            )}
          </div>
        )}

        {gameState === "playing" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-zinc-900/30 backdrop-blur-md p-5 rounded-[1.5rem] border border-zinc-800/50">
              <div>
                <span className="text-[9px] uppercase font-bold text-red-700 tracking-widest block mb-1">
                  Раунд {currentRound}
                </span>
                <span className="text-xl font-black text-white italic uppercase">
                  {teams[currentTeamIndex].name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase font-bold text-zinc-600 tracking-widest block mb-1">
                  Час
                </span>
                <span
                  className={`text-2xl font-mono font-black ${
                    timer < 10 ? "text-red-600 animate-pulse" : "text-white"
                  }`}
                >
                  0:{timer < 10 ? `0${timer}` : timer}
                </span>
              </div>
            </div>

            <AliasCard
              currentWord={wordsQueue[0] || "..."}
              isSpeaker={currentSpeaker === userName}
              isSpectator={isSpectator}
              speakerName={currentSpeaker}
              onNext={handleNextWord}
            />

            <div className="grid grid-cols-2 gap-4">
              {teams.map((team, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all ${
                    idx === currentTeamIndex
                      ? "bg-red-950/10 border-red-900/40 shadow-[0_0_20px_rgba(153,27,27,0.1)]"
                      : "bg-zinc-900/10 border-zinc-800/40"
                  }`}
                >
                  <p className="text-[8px] uppercase tracking-widest text-zinc-600 mb-1">
                    {team.name}
                  </p>
                  <p
                    className={`text-2xl font-black ${
                      idx === currentTeamIndex ? "text-red-700" : "text-zinc-500"
                    }`}
                  >
                    {team.score}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {gameState === "results" && (
          <div className="text-center space-y-8 animate-in zoom-in-95">
            <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter">
              Час вийшов!
            </h2>
            <div className="bg-zinc-900/30 backdrop-blur-xl border border-zinc-800 p-8 rounded-[2.5rem] space-y-4">
              {teams.map((t, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-3 border-b border-zinc-800/50 last:border-0 italic font-black text-2xl uppercase"
                >
                  <span className={i === currentTeamIndex ? "text-white" : "text-zinc-600"}>
                    {t.name}
                  </span>
                  <span className="text-red-700">{t.score}</span>
                </div>
              ))}
            </div>
            {canControl ? (
              <button
                onClick={handleNextTurn}
                className="w-full py-5 bg-zinc-100 text-black rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95"
              >
                ПЕРЕДАТИ ХІД
              </button>
            ) : (
              <div className="text-center p-4 opacity-50">
                <p className="text-[10px] uppercase font-bold tracking-widest">
                  Чекаємо, поки {currentSpeaker} передасть хід...
                </p>
              </div>
            )}
          </div>
        )}

        {gameState === "final" && (
          <div className="text-center space-y-10 animate-in fade-in duration-1000">
            <div className="space-y-2">
              <h1 className="text-6xl font-black italic uppercase text-white tracking-tighter">
                GAME OVER
              </h1>
              <div className="h-1 w-24 bg-red-700 mx-auto"></div>
            </div>
            <div className="bg-white text-black p-10 rounded-[3rem] shadow-[0_0_50px_rgba(255,255,255,0.15)] transform -rotate-1">
              <p className="uppercase text-[10px] font-black tracking-[0.3em] mb-6 opacity-40">
                The Winner is
              </p>
              <h2 className="text-4xl font-black italic uppercase leading-none mb-2">
                {teams[0].score > teams[1].score ? teams[0].name : teams[1].name}
              </h2>
              <p className="text-6xl font-mono font-black text-red-700">
                {Math.max(teams[0].score, teams[1].score)}
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="text-zinc-600 hover:text-white uppercase text-[10px] font-bold tracking-[0.5em] underline underline-offset-8"
            >
              ГРАТИ ЗНОВУ
            </button>
          </div>
        )}
      </div>
    </main>
  );
}