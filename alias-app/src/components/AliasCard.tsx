"use client";

interface GameProps {
  currentWord: string;
  isSpeaker: boolean;
  speakerName: string | null;
  onNext: (guessed: boolean) => void;
}

export default function AliasCard({
  currentWord,
  isSpeaker,
  speakerName,
  onNext,
}: GameProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-zinc-950 text-white rounded-[2.5rem] shadow-2xl border border-zinc-900 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-900/50 to-transparent"></div>
      
      {isSpeaker ? (
        <>
          <span className="text-[10px] display-font uppercase tracking-[0.3em] text-red-700 mb-6 font-bold">
            Твоє слово:
          </span>
          
          <div className="w-full flex justify-center mb-16 px-2">
            <h2 
              className="font-black display-font text-center tracking-tighter uppercase break-words leading-[0.85]"
              style={{
                fontSize: 'clamp(1.5rem, 10vw, 3.5rem)',
                wordBreak: currentWord.length > 10 ? 'break-all' : 'normal'
              }}
            >
              {currentWord}
            </h2>
          </div>
          
          <div className="flex flex-col gap-3 w-full max-w-[240px]">
            <button
              onClick={() => onNext(true)}
              className="w-full py-4 bg-zinc-100 hover:bg-white text-black rounded-2xl transition-all font-black text-sm uppercase tracking-widest cursor-pointer active:scale-[0.96]"
            >
              Вгадано
            </button>
            
            <button
              onClick={() => onNext(false)}
              className="w-full py-3 bg-transparent hover:bg-red-950/30 text-zinc-500 hover:text-red-500 rounded-2xl transition-all font-bold text-[11px] uppercase tracking-widest cursor-pointer"
            >
              Пропустити (-1)
            </button>
          </div>
        </>
      ) : (
        <div className="text-center space-y-6">
          <div className="relative py-10">
            <div className="absolute inset-0 blur-2xl bg-red-900/10 rounded-full animate-pulse"></div>
            <h2 className="relative text-2xl font-light text-zinc-400 tracking-wide">
              Гравець <span className="text-red-700 font-bold uppercase italic">{speakerName || "..."}</span> <br/>
              <span className="text-sm opacity-50">пояснює слово</span>
            </h2>
          </div>
          <div className="flex justify-center gap-1">
            <span className="w-1 h-1 bg-red-900 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1 h-1 bg-red-900 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1 h-1 bg-red-900 rounded-full animate-bounce"></span>
          </div>
        </div>
      )}
    </div>
  );
}