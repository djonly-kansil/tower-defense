export interface Position {
  x: number;
  y: number;
}

export interface TurretType {
  id: string;
  name: string;
  cost: number;
  damage: number;
  range: number;
  cooldown: number;
  color: string;
}

export const TURRET_TYPES: Record<string, TurretType> = {
  basic: {
    id: 'basic',
    name: 'Basic',
    cost: 50,
    damage: 15,
    range: 120,
    cooldown: 45,
    color: '#3b82f6', // blue-500
  },
  sniper: {
    id: 'sniper',
    name: 'Sniper',
    cost: 120,
    damage: 50,
    range: 250,
    cooldown: 120,
    color: '#ef4444', // red-500
  },
  rapid: {
    id: 'rapid',
    name: 'Rapid',
    cost: 80,
    damage: 5,
    range: 100,
    cooldown: 15,
    color: '#eab308', // yellow-500
  }
};

export interface GameState {
  money: number;
  lives: number;
  wave: number;
  isGameOver: boolean;
  selectedCell: Position | null;
  cellHasTurret: boolean;
}
