'use client'

import { useGame } from '@/lib/game/store'
import { getEngine } from '@/lib/game/engine'
import { GameIcon } from './GameIcon'

export default function DialogueOverlay() {
  const dialogue = useGame((s) => s.dialogue)
  if (!dialogue) return null
  const engine = getEngine()

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-center bg-gradient-to-t from-black/60 via-transparent to-transparent pb-0">
      <div className="pointer-events-auto m-3 mb-4 w-full max-w-3xl rounded border border-[#5a4632] game-panel p-4 sm:p-5">
        <div className="flex gap-4">
          {/* Портрет */}
          <div className="hidden shrink-0 flex-col items-center sm:flex">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full border-2"
              style={{ borderColor: dialogue.portraitColor, color: dialogue.portraitColor, background: 'rgba(20,16,12,0.8)' }}
            >
              <GameIcon name={dialogue.portraitIcon} className="h-8 w-8" />
            </span>
            <span className="mt-1 h-8 w-px bg-gradient-to-b from-[#5a4632] to-transparent" />
          </div>
          {/* Текст */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-3">
              <p className="game-title-font text-base font-semibold text-[#f5c96b]">{dialogue.speaker}</p>
              <p className="text-[11px] uppercase tracking-widest text-[#8a8068]">{dialogue.role}</p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#e8d5a8]">{dialogue.text}</p>
            {/* Варианты */}
            <div className="mt-4 flex flex-col gap-1.5">
              {dialogue.choices.map((c, i) => (
                <button
                  key={i}
                  onClick={() => engine?.chooseOption(i)}
                  className="group flex items-center gap-2 rounded border border-[#3a2e20] bg-[#241c14]/60 px-3 py-2 text-left text-sm text-[#cfc0a0] transition hover:border-[#d9a441] hover:bg-[#2a2118] hover:text-[#f5c96b]"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-[#5a4632] text-[10px] font-bold text-[#9a8f78] group-hover:border-[#d9a441] group-hover:text-[#d9a441]">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">{c.text}</span>
                  {c.tag && (
                    <span className="shrink-0 rounded bg-[#3a2e20] px-1.5 py-0.5 text-[10px] tracking-wider text-[#d9a441]">
                      {c.tag}
                    </span>
                  )}
                  {c.checkLabel && (
                    <span className="shrink-0 rounded border border-[#d9a441]/50 px-1.5 py-0.5 text-[10px] text-[#f5c96b]">
                      {c.checkLabel}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
