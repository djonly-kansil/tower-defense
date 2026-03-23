/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/engine';
import { GameState, TURRET_TYPES } from './game/types';
import { Coins, Heart, ShieldAlert, DollarSign } from 'lucide-react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  
  const [gameState, setGameState] = useState<GameState>({
    money: 200,
    lives: 20,
    wave: 1,
    isGameOver: false,
    selectedCell: null,
    cellHasTurret: false,
  });

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const engine = new GameEngine(canvasRef.current, (state) => {
      setGameState(state);
    });
    
    engine.start();
    engineRef.current = engine;
    
    return () => {
      engine.stop();
    };
  }, []);

  const handleBuild = (typeId: string) => {
    engineRef.current?.buildTurret(typeId);
  };

  const handleSell = () => {
    engineRef.current?.sellTurret();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      
      {/* Header Stats */}
      <div className="w-full max-w-[640px] flex justify-between items-center mb-4 bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700">
        <div className="flex items-center gap-2 text-yellow-400 font-bold text-xl">
          <Coins size={24} />
          <span>{gameState.money}</span>
        </div>
        <div className="flex items-center gap-2 text-blue-400 font-bold text-xl">
          <ShieldAlert size={24} />
          <span>Wave {gameState.wave}</span>
        </div>
        <div className="flex items-center gap-2 text-red-400 font-bold text-xl">
          <Heart size={24} />
          <span>{gameState.lives}</span>
        </div>
      </div>

      {/* Game Canvas Container */}
      <div className="relative w-full max-w-[640px] aspect-[4/3] bg-black rounded-xl overflow-hidden shadow-2xl border-4 border-slate-800">
        <canvas 
          ref={canvasRef} 
          className="w-full h-full object-contain touch-none"
        />
        
        {/* Game Over Overlay */}
        {gameState.isGameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
            <h1 className="text-5xl font-black text-red-500 mb-4">GAME OVER</h1>
            <p className="text-xl text-slate-300 mb-8">You reached Wave {gameState.wave}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full transition-colors"
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* Build/Sell Menu */}
      <div className="w-full max-w-[640px] mt-4 h-32">
        {gameState.selectedCell ? (
          <div className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700 h-full flex flex-col justify-center">
            <h3 className="text-sm text-slate-400 mb-2 uppercase tracking-wider font-semibold">
              {gameState.cellHasTurret ? 'Manage Turret' : 'Build Turret'}
            </h3>
            
            {gameState.cellHasTurret ? (
              <button 
                onClick={handleSell}
                className="flex items-center justify-center gap-2 w-full py-3 bg-red-600/20 text-red-400 border border-red-600/50 hover:bg-red-600/40 rounded-lg font-bold transition-colors"
              >
                <DollarSign size={20} />
                Sell Turret
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {Object.values(TURRET_TYPES).map(turret => {
                  const canAfford = gameState.money >= turret.cost;
                  return (
                    <button
                      key={turret.id}
                      onClick={() => handleBuild(turret.id)}
                      disabled={!canAfford}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-colors ${
                        canAfford 
                          ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-white' 
                          : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-sm mb-1" style={{ backgroundColor: turret.color }} />
                      <span className="text-xs font-bold">{turret.name}</span>
                      <span className={`text-xs ${canAfford ? 'text-yellow-400' : 'text-slate-500'}`}>
                        ${turret.cost}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl h-full flex items-center justify-center text-slate-500">
            Tap on an empty grid space to build turrets
          </div>
        )}
      </div>
      
    </div>
  );
}
