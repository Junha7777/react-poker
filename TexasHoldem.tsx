import React, { useState } from "react";
import "./styles.css";

const SUITS = ["♠", "♥", "♦", "♣"] as const;
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;

type Card = { rank: typeof RANKS[number]; suit: typeof SUITS[number] };

const freshDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({ rank: r, suit: s });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

const CardView = ({ c, hidden = false }: { c: Card; hidden?: boolean }) => {
  const red = c.suit === "♥" || c.suit === "♦";
  return (
    <div
      className={`w-24 h-32 rounded-2xl border-2 shadow-md bg-white relative flex items-center justify-center mx-2 ${
        hidden ? "bg-neutral-700 border-neutral-800" : "border-neutral-300"
      }`}
    >
      {hidden ? (
        <div className="w-full h-full rounded-2xl bg-gradient-to-br from-neutral-700 to-neutral-900" />
      ) : (
        <div className={`text-center select-none ${red ? "text-red-600" : "text-neutral-900"}`}>
          <div className="text-lg absolute top-2 left-3">{c.rank}</div>
          <div className="text-3xl">{c.suit}</div>
          <div className="text-lg absolute bottom-2 right-3 rotate-180">{c.rank}</div>
        </div>
      )}
    </div>
  );
};

const Hand = ({ cards, hideCpu = false }: { cards: Card[]; hideCpu?: boolean }) => (
  <div className="flex items-center justify-center gap-3">
    {cards.map((c, i) => (
      <CardView key={i} c={c} hidden={hideCpu && i < cards.length} />
    ))}
  </div>
);

const evaluateHandRank = (cards: Card[]): { rank: string; strength: number } => {
  const ranks = cards.map((c) => RANKS.indexOf(c.rank) + 2).sort((a, b) => a - b);
  const suits = cards.map((c) => c.suit);
  const counts = ranks.reduce((acc: Record<number, number>, val) => {
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
  const values = Object.values(counts);
  const flush =
  Object.values(
    suits.reduce((acc: Record<string, number>, s) => {
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {})
  ).some((count) => count >= 5);

  const uniqueRanks = [...new Set(ranks)];
  const straight = uniqueRanks.length >= 5 && uniqueRanks.slice(-5).every((v, i, arr) => i === 0 || v === arr[i - 1] + 1);

  const rankOrder = [
    "High Card",
    "One Pair",
    "Two Pairs",
    "Triple",
    "Straight",
    "Flush",
    "Full-House",
    "Four Card",
    "Straight Flush",
    "Royale Straight Flush",
  ];

  let rankName = "High Card";
  if (straight && flush && ranks.includes(14)) rankName = "Royale Straight Flush";
  else if (straight && flush) rankName = "Straight Flush";
  else if (values.includes(4)) rankName = "Four Cards";
  else if (values.includes(3) && values.includes(2)) rankName = "Full-House";
  else if (flush) rankName = "Flush";
  else if (straight) rankName = "Straight";
  else if (values.includes(3)) rankName = "Triple";
  else if (values.filter((v) => v === 2).length === 2) rankName = "Two Pairs";
  else if (values.includes(2)) rankName = "One Pair";

  const base = rankOrder.indexOf(rankName);
  const kicker = Math.max(...ranks) / 100;
  return { rank: rankName, strength: base + kicker };
};

export default function TexasHoldem() {
  const [deck, setDeck] = useState<Card[]>(freshDeck());
  const [player, setPlayer] = useState<Card[]>([]);
  const [cpu, setCpu] = useState<Card[]>([]);
  const [community, setCommunity] = useState<Card[]>([]);
  const [message, setMessage] = useState<string>("");
  const [stage, setStage] = useState<string>("ready");
  const [playerChips, setPlayerChips] = useState(1000);
  const [cpuChips, setCpuChips] = useState(1000);
  const [pot, setPot] = useState(0);
  const [bet, setBet] = useState(50);

  const deal = () => {
    if (playerChips <= 0 || cpuChips <= 0) return setMessage("Game Over. One player is bankrupt.");
    const d = [...deck];
    const playerHand = [d.pop()!, d.pop()!];
    const cpuHand = [d.pop()!, d.pop()!];
    setPlayer(playerHand);
    setCpu(cpuHand);
    setDeck(d);
    setCommunity([]);
    setMessage("");
    setStage("playing");
    const initBet = Math.min(bet, playerChips, cpuChips);
    setPot(initBet * 2);
    setPlayerChips((c) => c - initBet);
    setCpuChips((c) => c - initBet);
  };

  const nextStage = () => {
    const d = [...deck];
    if (community.length < 3) {
      setCommunity([d.pop()!, d.pop()!, d.pop()!]);
    } else if (community.length < 5) {
      setCommunity((prev) => [...prev, d.pop()!]);
    } else {
      evaluateWinner();
      return;
    }
    setDeck(d);
  };

  const evaluateWinner = () => {
    const playerEval = evaluateHandRank([...player, ...community]);
    const cpuEval = evaluateHandRank([...cpu, ...community]);

    if (playerEval.strength > cpuEval.strength) {
      setMessage(`You Win! (${playerEval.rank})`);
      setPlayerChips((c) => c + pot);
    } else if (playerEval.strength < cpuEval.strength) {
      setMessage(`CPU Wins. (${cpuEval.rank})`);
      setCpuChips((c) => c + pot);
    } else {
      setMessage(`Draw. (${playerEval.rank})`);
      setPlayerChips((c) => c + pot / 2);
      setCpuChips((c) => c + pot / 2);
    }
    setStage("showdown");
  };

  const reset = () => {
    setDeck(freshDeck());
    setPlayer([]);
    setCpu([]);
    setCommunity([]);
    setMessage("");
    setStage("ready");
    setPot(0);
  };

  const cpuDecision = (playerRaised: boolean = false, raiseAmount: number = bet) => {
    const cpuEval = evaluateHandRank([...cpu, ...community]);
    const strength = cpuEval.strength;
    const bluffChance = Math.random();

    if (playerRaised) {
      if (strength > 5 || bluffChance < 0.25) {
        if (cpuChips >= raiseAmount) {
          setCpuChips((c) => c - raiseAmount);
          setPot((p) => p + raiseAmount);
          setMessage(`CPU calls your raise.`);
        } else {
          setMessage("CPU can't afford your raise and folds. You win!");
          setPlayerChips((c) => c + pot + raiseAmount);
          setStage("folded");
          return;
        }
      } else {
        setMessage("CPU folds. You win!");
        setPlayerChips((c) => c + pot + raiseAmount);
        setStage("folded");
        return;
      }
    } else {
      if (bluffChance < 0.1) {
        setCpuChips((c) => c - bet);
        setPot((p) => p + bet);
        setMessage("CPU bluffs and raises!");
      } else if (strength > 5 && Math.random() < 0.5) {
        setCpuChips((c) => c - bet);
        setPot((p) => p + bet);
        setMessage("CPU raises confidently.");
      } else {
        setMessage("CPU checks.");
      }
    }

    nextStage();
  };

  const handleCheck = () => {
    if (stage === "playing") {
      setMessage("You check.");
      cpuDecision();
    }
  };

  const handleRaise = () => {
    if (stage === "playing" && playerChips >= bet) {
      const raiseAmount = bet;
      setPlayerChips((c) => c - raiseAmount);
      setPot((p) => p + raiseAmount);
      setMessage(`You raise ${raiseAmount}.`);
      cpuDecision(true, raiseAmount);
    }
  };

  const handleFold = () => {
    setMessage("You Fold. CPU Wins.");
    setCpuChips((c) => c + pot);
    setStage("folded");
  };

  const showPlayerRank = stage === "playing" || stage === "showdown";

  return (
    <div className="min-h-screen w-full bg-green-700 text-white flex items-center justify-center p-8">
      <div className="w-full max-w-6xl mx-auto text-center">
        <h1 className="text-5xl font-extrabold mb-8">Texas Hold'em</h1>

        <div className="text-2xl font-semibold">Pot: {pot}</div>
        <div className="mb-6 text-lg">You: {playerChips} | CPU: {cpuChips}</div>

        {/* Community cards */}
        <div className="flex justify-center gap-6 mb-8">
          {community.map((c, i) => (
            <CardView key={i} c={c} />
          ))}
        </div>

        {/* Three-column stage: You | Controls+Message | CPU */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-center md:justify-between gap-8">
          {/* You */}
          <div className="flex-1 flex flex-col items-center">
            <h2 className="font-bold text-2xl mb-4">
              You {showPlayerRank && `(${evaluateHandRank([...player, ...community]).rank})`}
            </h2>
            <Hand cards={player} />
          </div>

          {/* Center Controls */}
          <div className="flex-1 flex flex-col items-center">
            {stage === "ready" && (
              <button onClick={deal} className="bg-yellow-400 text-black font-bold text-xl px-6 py-3 rounded-lg hover:bg-yellow-500">Deal</button>
            )}
            {stage === "playing" && (
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-4 items-center justify-center">
                  <button onClick={handleCheck} className="bg-blue-400 text-black font-bold text-xl px-6 py-3 rounded-lg hover:bg-blue-500">Check</button>
                  <div className="flex items-center gap-3 bg-white rounded-lg px-3 py-2">
                    <input
                      type="number"
                      min={10}
                      max={playerChips}
                      step={10}
                      value={bet}
                      onChange={(e) => setBet(Number(e.target.value))}
                      className="w-24 text-black text-center text-lg rounded px-2 py-1 bg-gray-100 border border-gray-300"
                    />
                    <button onClick={handleRaise} className="bg-orange-400 text-black font-bold text-xl px-6 py-3 rounded-lg hover:bg-orange-500">Raise</button>
                  </div>
                  <button onClick={handleFold} className="bg-red-400 text-black font-bold text-xl px-6 py-3 rounded-lg hover:bg-red-500">Fold</button>
                </div>
                <div className="text-2xl font-semibold min-h-[40px]">{message}</div>
              </div>
            )}
            {(stage === "showdown" || stage === "folded") && (
              <div className="flex flex-col items-center gap-4">
                <div className="text-2xl font-semibold min-h-[40px]">{message}</div>
                <button onClick={reset} className="bg-gray-300 text-black font-bold text-xl px-6 py-3 rounded-lg hover:bg-gray-400">Reset</button>
              </div>
            )}
          </div>

          {/* CPU */}
          <div className="flex-1 flex flex-col items-center">
            <h2 className="font-bold text-2xl mb-4">
              CPU {stage === "showdown" && `(${evaluateHandRank([...cpu, ...community]).rank})`}
            </h2>
            <Hand cards={cpu} hideCpu={stage !== "showdown"} />
          </div>
        </div>
      </div>
    </div>
  );
}
