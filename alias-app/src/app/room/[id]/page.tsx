"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import AliasCard from "@/components/AliasCard";

export default function GameRoom({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.id;
  const searchParams = useSearchParams();
  const initialDifficulty = searchParams.get("level") || "mixed";

  const [gameState, setGameState] = useState<"setup" | "playing" | "results" | "final">("setup");
  
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [totalRounds, setTotalRounds] = useState(3);
  const [currentRound, setCurrentRound] = useState(1);
  const [timer, setTimer] = useState(60);
  const [isActive, setIsActive] = useState(false);

  const [teams, setTeams] = useState([
    { name: "Alpha Team", score: 0 },
    { name: "Bravo Team", score: 0 },
  ]);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [wordsQueue, setWordsQueue] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchNewWords = useCallback(async (level: string, excluded: string[]) => {
    setLoading(true);
    try {
      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty: level, excludedWords: excluded }),
      });
      const data = await res.json();
      if (data.words && data.words.length > 0) {
        setWordsQueue((prev) => [...prev, ...data.words]);
        return data.words;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
    return [];
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else if (timer === 0 && isActive) {
      setIsActive(false);
      setGameState("results");
    }
    return () => clearInterval(interval);
  }, [isActive, timer]);

  const startGame = async () => {
    setLoading(true);
    setWordsQueue([]); 
    const words = await fetchNewWords(difficulty, usedWords);
    
    if (words.length > 0) {
      setGameState("playing");
      setIsActive(true);
      setTimer(60);
    } else {
      alert("Не вдалося завантажити слова. Спробуйте ще раз.");
    }
    setLoading(false);
  };

  const handleNextWord = (guessed: boolean) => {
    if (wordsQueue.length === 0) return;
    const currentWord = wordsQueue[0];
    const newTeams = [...teams];
    newTeams[currentTeamIndex].score += guessed ? 1 : -1;
    setTeams(newTeams);
    const newUsed = [...usedWords, currentWord];
    setUsedWords(newUsed);
    const nextQueue = wordsQueue.slice(1);
    setWordsQueue(nextQueue);
    if (nextQueue.length <= 3 && !loading) {
      fetchNewWords(difficulty, newUsed);
    }
  };

  const handleNextTurn = () => {
    if (currentTeamIndex === 1) {
      if (currentRound >= totalRounds) {
        setGameState("final");
        return;
      }
      setCurrentRound((prev) => prev + 1);
    }
    setCurrentTeamIndex((prev) => (prev === 0 ? 1 : 0));
    setGameState("setup");
    setTimer(60);
  };

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen bg-[#050505] p-6 text-zinc-300 overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-900/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-zinc-900/10 blur-[120px] rounded-full"></div>
      </div>

      {/* ROOM ID Badge (ВИДИМИЙ НОМЕР КІМНАТИ) */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-full backdrop-blur-md">
         <span className="text-[10px] font-black tracking-[0.3em] uppercase text-zinc-500">
           Кімната: <span className="text-red-600 select-all">{roomId}</span>
         </span>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {gameState === "setup" && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <header className="text-center">
              <h1 className="text-5xl font-black tracking-tighter text-white italic uppercase leading-none">
                ALIAS<span className="text-red-700">AI</span>
              </h1>
              <p className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase font-bold mt-3">Раунд {currentRound} з {totalRounds}</p>
            </header>

            <div className="bg-zinc-900/20 backdrop-blur-3xl border border-zinc-800/40 p-8 rounded-[2.5rem] space-y-6 shadow-2xl">
              {currentRound === 1 && usedWords.length === 0 ? (
                <div className="space-y-6">
                  {/* Team Names */}
                  <div className="space-y-3">
                    <label className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-black ml-1">Назви команд</label>
                    {teams.map((team, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={team.name}
                        onChange={(e) => {
                          const newTeams = [...teams];
                          newTeams[idx].name = e.target.value;
                          setTeams(newTeams);
                        }}
                        className="w-full px-5 py-4 bg-black/40 border border-zinc-800 rounded-2xl focus:border-red-800/50 transition-all outline-none text-white font-bold"
                        placeholder={`Команда ${idx + 1}`}
                      />
                    ))}
                  </div>

                  {/* Rounds Count */}
                  <div className="space-y-3">
                    <label className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-black ml-1">Кількість раундів</label>
                    <div className="flex gap-2">
                      {[3, 5, 10].map((num) => (
                        <button
                          key={num}
                          onClick={() => setTotalRounds(num)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${totalRounds === num ? "bg-white text-black border-white" : "bg-transparent text-zinc-600 border-zinc-800"}`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Difficulty Selection (ДОДАНО MIXED) */}
                  <div className="space-y-3">
                    <label className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-black ml-1">Складність</label>
                    <div className="grid grid-cols-4 gap-2">
                      {["easy", "mixed", "medium", "hard"].map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() => setDifficulty(lvl)}
                          className={`py-3 rounded-xl text-[9px] uppercase font-black transition-all border ${difficulty === lvl ? "bg-zinc-100 text-black border-zinc-100" : "bg-transparent text-zinc-600 border-zinc-800"}`}
                        >
                          {lvl === "easy" && "Low"}
                          {lvl === "mixed" && "Mix"}
                          {lvl === "medium" && "Mid"}
                          {lvl === "hard" && "High"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-black ml-1">Зараз ходять:</label>
                  <div className="p-4 bg-red-950/10 border border-red-900/30 rounded-2xl text-center">
                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                      {teams[currentTeamIndex].name}
                    </h2>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={startGame}
              disabled={loading}
              className="w-full py-5 bg-red-700 hover:bg-red-600 text-white rounded-2xl font-black text-lg tracking-widest transition-all cursor-pointer shadow-[0_20px_50px_-10px_rgba(185,28,28,0.4)] active:scale-95 disabled:opacity-50"
            >
              {loading ? "ЗАВАНТАЖЕННЯ..." : "ПОЧАТИ ХІД"}
            </button>
          </div>
        )}

        {/* ... (решта коду gameState === "playing", "results", "final" залишається без змін) ... */}
        {/* Копіюйте ваш попередній код для інших станів сюди */}
        {gameState === "playing" && (
           <div className="space-y-6 animate-in fade-in duration-500">
             <div className="flex justify-between items-center bg-zinc-900/30 backdrop-blur-md p-5 rounded-[1.5rem] border border-zinc-800/50">
               <div>
                 <span className="text-[9px] uppercase font-bold text-red-700 tracking-widest block mb-1">Раунд {currentRound}</span>
                 <span className="text-xl font-black text-white italic uppercase">{teams[currentTeamIndex].name}</span>
               </div>
               <div className="text-right">
                 <span className="text-[9px] uppercase font-bold text-zinc-600 tracking-widest block mb-1">Час</span>
                 <span className={`text-2xl font-mono font-black ${timer < 10 ? "text-red-600 animate-pulse" : "text-white"}`}>
                    0:{timer < 10 ? `0${timer}` : timer}
                 </span>
               </div>
             </div>

             <AliasCard 
               currentWord={wordsQueue[0] || "..."} 
               isSpeaker={true} 
               onNext={handleNextWord} 
             />

             <div className="grid grid-cols-2 gap-4">
                {teams.map((team, idx) => (
                  <div key={idx} className={`p-4 rounded-2xl border transition-all ${idx === currentTeamIndex ? 'bg-red-950/10 border-red-900/40' : 'bg-zinc-900/10 border-zinc-800/40'}`}>
                     <p className="text-[8px] uppercase tracking-widest text-zinc-600 mb-1">{team.name}</p>
                     <p className={`text-2xl font-black ${idx === currentTeamIndex ? 'text-red-700' : 'text-zinc-500'}`}>{team.score}</p>
                  </div>
                ))}
             </div>
           </div>
         )}
         {/* ... і так далі для results та final */}
         {gameState === "results" && (
          <div className="text-center space-y-8 animate-in zoom-in-95 duration-500">
             <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter">Час вийшов!</h2>
            <div className="bg-zinc-900/30 backdrop-blur-xl border border-zinc-800 p-8 rounded-[2.5rem] space-y-4">
              <p className="text-xs uppercase text-zinc-500 tracking-widest">Результати</p>
              {teams.map((t, i) => (
                <div key={i} className="flex justify-between items-center py-3 border-b border-zinc-800/50 last:border-0 italic font-black text-2xl uppercase">
                  <span className={i === currentTeamIndex ? "text-white" : "text-zinc-600"}>{t.name}</span>
                  <span className="text-red-700">{t.score}</span>
                </div>
              ))}
            </div>
            <button 
              onClick={handleNextTurn}
              className="w-full py-5 bg-zinc-100 hover:bg-white text-black rounded-2xl font-black uppercase tracking-widest cursor-pointer shadow-lg active:scale-95"
            >
              {currentTeamIndex === 1 && currentRound === totalRounds ? "ФІНАЛ" : "ПЕРЕДАТИ ХІД"}
            </button>
          </div>
        )}

        {gameState === "final" && (
          <div className="text-center space-y-10 animate-in fade-in duration-1000">
             <div className="space-y-2">
                <h1 className="text-6xl font-black italic uppercase text-white">GAME OVER</h1>
                <p className="text-red-700 font-bold tracking-[0.5em] uppercase text-[10px]">Битву завершено</p>
             </div>
             <div className="bg-white text-black p-8 rounded-[3rem] shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                <p className="uppercase text-[10px] font-black tracking-widest mb-6">Переможець</p>
                <h2 className="text-4xl font-black italic uppercase leading-none mb-2">
                  {teams[0].score > teams[1].score ? teams[0].name : teams[1].name}
                </h2>
                <p className="text-5xl font-mono font-black text-red-700">
                  {Math.max(teams[0].score, teams[1].score)}
                </p>
             </div>
             <button 
                onClick={() => window.location.reload()}
                className="text-zinc-500 hover:text-white transition-colors uppercase text-[10px] font-bold tracking-widest underline underline-offset-8"
             >
                Грати знову
             </button>
          </div>
        )}
      </div>
    </main>
  );
}