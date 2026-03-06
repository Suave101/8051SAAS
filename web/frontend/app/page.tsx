'use client';
import { useState } from 'react';
import AssemblyEditor from '../components/AssemblyEditor';
import CpuVisualizer from '../components/CpuVisualizer';

// Define the shape of our CPU state
export interface CpuState {
  a: number;
  b: number;
  pc: number;
  sp: number;
  psw: number;
  ram: Uint8Array;
  rom: Uint8Array;          // ← add ROM to state shape
}

export default function Home() {
  // Default state before any code runs
  const [cpuState, setCpuState] = useState<CpuState>({
    a: 0,
    b: 0,
    pc: 0,
    sp: 7,
    psw: 0,
    ram: new Uint8Array(256), // Array of 256 zeroes
    rom: new Uint8Array(256), // ← initialize ROM so the viewer has real data
  });

  return (
    <main className="flex h-screen w-full bg-base-100 overflow-hidden">
      <div className="w-1/2 border-r border-base-300 h-full">
        {/* Pass down a function to update the state */}
        <AssemblyEditor onRunSuccess={(newState) => setCpuState(newState)} />
      </div>
      <div className="w-1/2 h-full">
        {/* Pass down the state to be displayed */}
        <CpuVisualizer cpuState={cpuState} />
      </div>
    </main>
  );
}