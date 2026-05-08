"use client";

import { useState, useCallback, useEffect } from "react";
import { Chess } from "chess.js";
import { useChessWager, useChessGame } from "@/hooks/useChessWager";
import { useMiniPay } from "@/hooks/useMiniPay";
import { formatUnits } from "viem";

// ── Chess Board ──────────────────────────────────────────────────────────────

const FILES = ["a","b","c","d","e","f","g","h"];
const RANKS = ["8","7","6","5","4","3","2","1"];

const PIECE_UNICODE: Record<string, string> = {
  wK:"♔", wQ:"♕", wR:"♖", wB:"♗", wN:"♘", wP:"♙",
  bK:"♚", bQ:"♛", bR:"♜", bB:"♝", bN:"♞", bP:"♟",
};

function ChessBoard({
  game,
  onMove,
  playerColor,
  disabled,
}: {
  game: Chess;
  onMove: (from: string, to: string) => void;
  playerColor: "w" | "b";
  disabled: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hints, setHints]       = useState<string[]>([]);
  const board = game.board();

  const handleSquare = useCallback((sq: string) => {
    if (disabled) return;
    if (game.turn() !== playerColor) return;

    if (selected) {
      if (hints.includes(sq)) {
        onMove(selected, sq);
        setSelected(null);
        setHints([]);
      } else {
        const piece = game.get(sq as any);
        if (piece && piece.color === playerColor) {
          setSelected(sq);
          setHints(game.moves({ square: sq as any, verbose: true }).map((m) => m.to));
        } else {
          setSelected(null);
          setHints([]);
        }
      }
    } else {
      const piece = game.get(sq as any);
      if (piece && piece.color === playerColor) {
        setSelected(sq);
        setHints(game.moves({ square: sq as any, verbose: true }).map((m) => m.to));
      }
    }
  }, [selected, hints, game, playerColor, disabled, onMove]);

  const ranks = playerColor === "b" ? [...RANKS].reverse() : RANKS;
  const files = playerColor === "b" ? [...FILES].reverse() : FILES;

  return (
    <div className="select-none">
      <div className="inline-block border-2 border-casino-border rounded-xl overflow-hidden shadow-2xl">
        {ranks.map((rank, ri) => (
          <div key={rank} className="flex">
            <div className="w-5 flex items-center justify-center text-[10px] font-mono text-casino-muted bg-casino-card">
              {rank}
            </div>
            {files.map((file, fi) => {
              const sq = `${file}${rank}`;
              const piece = game.get(sq as any);
              const isLight = (ri + fi) % 2 === 0;
              const isSelected = sq === selected;
              const isHint = hints.includes(sq);
              const isLastMove = false;

              return (
                <div
                  key={sq}
                  onClick={() => handleSquare(sq)}
                  className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center cursor-pointer relative transition-all
                    ${isLight ? "chess-light" : "chess-dark"}
                    ${isSelected ? "ring-2 ring-inset ring-yellow-400" : ""}
                  `}
                >
                  {isHint && (
                    <div className={`absolute ${piece ? "inset-0 ring-2 ring-inset ring-green-400" : "w-3 h-3 rounded-full bg-black/30"}`} />
                  )}
                  {piece && (
                    <span className={`text-2xl md:text-3xl leading-none z-10 ${
                      piece.color === "w" ? "drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" : "drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]"
                    }`}>
                      {PIECE_UNICODE[`${piece.color}${piece.type.toUpperCase()}`]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div className="flex bg-casino-card">
          <div className="w-5" />
          {files.map((f) => (
            <div key={f} className="w-10 md:w-12 text-center text-[10px] font-mono text-casino-muted py-0.5">{f}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Move History ─────────────────────────────────────────────────────────────

function MoveHistory({ history }: { history: string[] }) {
  const pairs: [string, string?][] = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push([history[i], history[i + 1]]);
  }
  return (
    <div className="h-40 overflow-y-auto space-y-1 pr-1">
      {pairs.length === 0 && (
        <p className="text-casino-muted text-xs font-mono text-center pt-8">Game not started</p>
      )}
      {pairs.map((pair, i) => (
        <div key={i} className="flex items-center gap-2 text-xs font-mono">
          <span className="text-casino-muted w-6 text-right">{i + 1}.</span>
          <span className="flex-1 px-2 py-0.5 rounded bg-casino-surface text-casino-text">{pair[0]}</span>
          {pair[1] && (
            <span className="flex-1 px-2 py-0.5 rounded bg-casino-surface text-casino-muted">{pair[1]}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Challenge List ────────────────────────────────────────────────────────────

function ChallengeList({
  challenges,
  onAccept,
  myAddress,
}: {
  challenges: number[];
  onAccept: (id: number) => void;
  myAddress?: string;
}) {
  return (
    <div className="space-y-2">
      {challenges.length === 0 && (
        <p className="text-casino-muted text-xs font-mono text-center py-6">No open challenges</p>
      )}
      {challenges.map((id) => (
        <div key={id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-casino-border glass">
          <div>
            <span className="font-mono text-sm text-casino-text">Game #{id}</span>
            <span className="text-xs text-casino-muted ml-2 font-mono">Open challenge</span>
          </div>
          <button
            onClick={() => onAccept(id)}
            className="btn-neon px-4 py-1.5 rounded-lg text-xs"
          >
            ACCEPT
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ChessPage() {
  const { isConnected, connectWallet, address } = useMiniPay();
  const {
    activeGameId, openChallenges, stakeAmount, setStakeAmount,
    createChallenge, acceptChallenge, attestResult, cancelChallenge,
    isTxPending, isApproving,
  } = useChessWager();

  const { game: onChainGame } = useChessGame(activeGameId);

  const [chess]     = useState(() => new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [view, setView] = useState<"lobby" | "game">("lobby");

  const playerColor: "w" | "b" =
    onChainGame && address
      ? onChainGame.white.toLowerCase() === address.toLowerCase() ? "w" : "b"
      : "w";

  const isMyTurn = !gameOver && chess.turn() === playerColor;

  const handleMove = useCallback((from: string, to: string) => {
    try {
      const move = chess.move({ from: from as any, to: to as any, promotion: "q" });
      if (!move) return;
      setFen(chess.fen());
      setMoveHistory([...chess.history()]);

      if (chess.isGameOver()) {
        if (chess.isCheckmate()) {
          setGameOver(chess.turn() === "w" ? "Black wins by checkmate" : "White wins by checkmate");
        } else {
          setGameOver("Draw");
        }
      }
    } catch {}
  }, [chess]);

  const handleCreateChallenge = async () => {
    await createChallenge(stakeAmount);
    setView("game");
  };

  const handleAccept = async (id: number) => {
    await acceptChallenge(id, stakeAmount);
    setView("game");
  };

  const handleAttest = async (result: 1 | 2 | 3) => {
    if (!activeGameId) return;
    await attestResult(activeGameId, result);
  };

  const statusText = () => {
    if (!onChainGame) return null;
    const statusMap = ["Open", "Active", "Resolved", "Cancelled"];
    return statusMap[onChainGame.status];
  };

  const QUICK_STAKES = ["1", "5", "10", "25", "50"];

  return (
    <div className="min-h-screen pt-4 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-black text-2xl text-casino-purple tracking-widest">
              CHESS WAGER
            </h1>
            <p className="text-casino-muted text-xs font-mono mt-1">
              P2P · Stake USDm · Winner takes all
            </p>
          </div>
          {activeGameId > 0 && (
            <div className="px-3 py-1.5 rounded-lg border border-casino-purple/40 bg-casino-purple/10 text-casino-purple text-xs font-mono font-bold">
              GAME #{activeGameId} · {statusText()}
            </div>
          )}
        </div>

        {/* Tab nav */}
        <div className="flex gap-2 mb-6">
          {(["lobby", "game"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-5 py-2 rounded-xl text-xs font-mono font-bold tracking-wider transition-all ${
                view === v
                  ? "bg-casino-purple/20 text-casino-purple border border-casino-purple/40"
                  : "glass border border-casino-border text-casino-muted hover:text-casino-text"
              }`}
            >
              {v === "lobby" ? "🏰 LOBBY" : "♟️ GAME"}
            </button>
          ))}
        </div>

        {view === "lobby" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Create Challenge */}
            <div className="glass rounded-2xl border border-casino-border p-6">
              <h2 className="font-display text-xs tracking-[0.2em] text-casino-muted mb-5">CREATE CHALLENGE</h2>

              <label className="text-xs font-mono text-casino-muted mb-2 block">YOUR STAKE (USDm)</label>
              <input
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                min="1"
                max="1000"
                className="w-full bg-casino-bg border border-casino-border rounded-xl px-4 py-3 text-casino-text font-mono text-xl focus:outline-none focus:border-casino-purple mb-2"
              />
              <div className="flex gap-2 mb-5">
                {QUICK_STAKES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStakeAmount(s)}
                    className="flex-1 text-xs font-mono py-1.5 rounded-lg border border-casino-border text-casino-muted hover:border-casino-purple hover:text-casino-purple transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="bg-casino-bg rounded-xl border border-casino-border p-4 mb-5 space-y-2">
                {[
                  ["Your stake",   `${stakeAmount} USDm`],
                  ["Opponent stakes", `${stakeAmount} USDm`],
                  ["Total pot",    `${(parseFloat(stakeAmount || "0") * 2).toFixed(2)} USDm`],
                  ["Winner gets",  `${(parseFloat(stakeAmount || "0") * 2 * 0.95).toFixed(2)} USDm`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs font-mono">
                    <span className="text-casino-muted">{k}</span>
                    <span className={k === "Winner gets" ? "text-casino-neon font-bold" : "text-casino-text"}>{v}</span>
                  </div>
                ))}
              </div>

              {!isConnected ? (
                <button onClick={connectWallet} className="btn-gold w-full py-3 rounded-xl">CONNECT WALLET</button>
              ) : (
                <button
                  onClick={handleCreateChallenge}
                  disabled={isTxPending || isApproving || activeGameId > 0}
                  className="w-full py-3 rounded-xl font-display font-bold text-sm tracking-wider transition-all border border-casino-purple text-casino-purple hover:bg-casino-purple/10 disabled:opacity-40"
                >
                  {isApproving ? "APPROVING…" : isTxPending ? "CREATING…" : activeGameId > 0 ? "IN A GAME" : "CREATE CHALLENGE"}
                </button>
              )}
            </div>

            {/* Open Challenges */}
            <div className="glass rounded-2xl border border-casino-border p-6">
              <h2 className="font-display text-xs tracking-[0.2em] text-casino-muted mb-5">OPEN CHALLENGES</h2>
              <ChallengeList
                challenges={openChallenges}
                onAccept={handleAccept}
                myAddress={address}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Board */}
            <div className="lg:col-span-2 flex flex-col items-center">
              {/* Opponent info */}
              <div className="w-full max-w-[440px] flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-casino-surface border border-casino-border flex items-center justify-center text-sm">
                    {playerColor === "w" ? "♚" : "♔"}
                  </div>
                  <span className="font-mono text-xs text-casino-muted">
                    {onChainGame
                      ? (playerColor === "w" ? onChainGame.black : onChainGame.white).slice(0, 10) + "…"
                      : "Opponent"}
                  </span>
                </div>
                <div className={`w-2 h-2 rounded-full ${chess.turn() !== playerColor ? "bg-casino-neon animate-pulse" : "bg-casino-muted"}`} />
              </div>

              <ChessBoard
                game={chess}
                onMove={handleMove}
                playerColor={playerColor}
                disabled={!isMyTurn || !!gameOver || !onChainGame || onChainGame.status !== 1}
              />

              {/* Player info */}
              <div className="w-full max-w-[440px] flex items-center justify-between mt-3 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-casino-gold/20 border border-casino-gold/40 flex items-center justify-center text-sm">
                    {playerColor === "w" ? "♔" : "♚"}
                  </div>
                  <span className="font-mono text-xs text-casino-gold">
                    You ({playerColor === "w" ? "White" : "Black"})
                  </span>
                </div>
                <div className={`w-2 h-2 rounded-full ${chess.turn() === playerColor ? "bg-casino-neon animate-pulse" : "bg-casino-muted"}`} />
              </div>

              {/* Game over */}
              {gameOver && (
                <div className="mt-4 w-full max-w-[440px] glass rounded-2xl border border-casino-gold/40 p-4 text-center">
                  <p className="font-display font-bold text-casino-gold text-lg mb-3">{gameOver}</p>
                  <div className="flex gap-3 justify-center">
                    {[
                      { label: "I Won",  result: playerColor === "w" ? 1 : 2 as 1|2|3 },
                      { label: "Draw",   result: 3 as 1|2|3 },
                      { label: "I Lost", result: playerColor === "w" ? 2 : 1 as 1|2|3 },
                    ].map((r) => (
                      <button
                        key={r.label}
                        onClick={() => handleAttest(r.result)}
                        disabled={isTxPending}
                        className={`px-4 py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                          r.label === "I Won"  ? "border-casino-neon text-casino-neon hover:bg-casino-neon/10" :
                          r.label === "Draw"   ? "border-casino-muted text-casino-muted hover:bg-white/5" :
                                                 "border-casino-red text-casino-red hover:bg-casino-red/10"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-casino-muted mt-2 font-mono">
                    Both players must agree. Admin resolves disputes.
                  </p>
                </div>
              )}
            </div>

            {/* Side panel */}
            <div className="space-y-4">
              {/* Game info */}
              <div className="glass rounded-2xl border border-casino-border p-4">
                <h3 className="font-display text-xs tracking-[0.2em] text-casino-muted mb-3">GAME INFO</h3>
                <div className="space-y-2">
                  {onChainGame ? [
                    ["Game ID",   `#${onChainGame.id}`],
                    ["Stake",     `${formatUnits(BigInt(onChainGame.stake), 18)} USDm each`],
                    ["Pot",       `${(parseFloat(formatUnits(BigInt(onChainGame.stake), 18)) * 2 * 0.95).toFixed(2)} USDm`],
                    ["Status",    statusText() ?? "—"],
                    ["Turn",      chess.turn() === "w" ? "White" : "Black"],
                  ] : [
                    ["Status", "No active game"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs font-mono">
                      <span className="text-casino-muted">{k}</span>
                      <span className="text-casino-text">{v}</span>
                    </div>
                  ))}
                </div>

                {onChainGame?.status === 0 && (
                  <button
                    onClick={() => cancelChallenge(activeGameId)}
                    disabled={isTxPending}
                    className="w-full mt-4 py-2 rounded-xl text-xs font-mono border border-casino-red/40 text-casino-red hover:bg-casino-red/10 transition-all"
                  >
                    CANCEL CHALLENGE
                  </button>
                )}
              </div>

              {/* Move history */}
              <div className="glass rounded-2xl border border-casino-border p-4">
                <h3 className="font-display text-xs tracking-[0.2em] text-casino-muted mb-3">MOVE HISTORY</h3>
                <MoveHistory history={moveHistory} />
              </div>

              {/* Status */}
              <div className="glass rounded-2xl border border-casino-border p-4">
                <h3 className="font-display text-xs tracking-[0.2em] text-casino-muted mb-2">TURN</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isMyTurn ? "bg-casino-neon animate-pulse" : "bg-casino-muted"}`} />
                  <span className="font-mono text-sm text-casino-text">
                    {gameOver ? "Game over" : isMyTurn ? "Your turn" : "Opponent's turn"}
                  </span>
                </div>
                {chess.inCheck() && (
                  <p className="text-casino-red text-xs font-mono mt-2">⚠ In check!</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
