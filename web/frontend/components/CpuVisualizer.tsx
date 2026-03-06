'use client';

import { useState } from 'react';

// Helper to turn numbers into 2-digit hex strings
const toHex = (num: number = 0, padding: number = 2) => 
  num.toString(16).toUpperCase().padStart(padding, '0');

export default function CpuVisualizer({ cpuState }: { cpuState: any }) {
  const [activeTab, setActiveTab] = useState<'data' | 'code'>('data');

  if (!cpuState) return null;

  // --- 1. DATA MAPPING ---
  const sfrs = {
    B: `0x${toHex(cpuState.b)}`, 
    ACC: `0x${toHex(cpuState.a)}`, 
    PSW: `0x${toHex(cpuState.psw)}`, 
    SP: `0x${toHex(cpuState.sp)}`,
    DPH: "0x00", DPL: "0x00", 
    IP: "0x00", IE: "0x00", PCON: "0x00"
  };
  
  const pcValue = cpuState.pc || 0; // The raw number for logic
  const pcDisplay = `0x${toHex(pcValue, 4)}`; // The string for UI

  const regs = {
    R7: `0x${toHex(cpuState.ram[7])}`, R6: `0x${toHex(cpuState.ram[6])}`, 
    R5: `0x${toHex(cpuState.ram[5])}`, R4: `0x${toHex(cpuState.ram[4])}`,
    R3: `0x${toHex(cpuState.ram[3])}`, R2: `0x${toHex(cpuState.ram[2])}`, 
    R1: `0x${toHex(cpuState.ram[1])}`, R0: `0x${toHex(cpuState.ram[0])}`,
  };

  const pswBits = (cpuState.psw || 0).toString(2).padStart(8, '0').split('').map(Number);

  const ports = { 
    P3: `0x${toHex(cpuState.ram[0xB0])}`, 
    P2: `0x${toHex(cpuState.ram[0xA0])}`, 
    P1: `0x${toHex(cpuState.ram[0x90])}`, 
    P0: `0x${toHex(cpuState.ram[0x80])}` 
  };

  const hexCols = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
  const displayData = activeTab === 'data' ? cpuState.ram : (cpuState.rom || new Uint8Array(256));

  // --- 2. THE RENDER HELPER (Now utilized) ---
  const renderMemoryGrid = (data: Uint8Array, type: 'data' | 'code') => {
    const rows = Array.from({ length: 16 }, (_, i) => toHex(i * 16));
    
    return (
      <div className="w-full flex flex-col border-t border-l border-white/5 font-mono text-[10px]">
        {/* Header */}
        <div className="flex bg-base-300/50 text-neutral-content/40 font-bold">
          <div className="w-10 border-r border-b border-white/5 py-1 text-center italic">Addr</div>
          {hexCols.map(col => (
            <div key={col} className="flex-1 text-center border-r border-b border-white/5 py-1">{col}</div>
          ))}
        </div>
        {/* Rows */}
        {rows.map((rowLabel, rowIndex) => (
          <div key={rowLabel} className="flex border-b border-white/5 hover:bg-white/5 transition-colors">
            <div className="w-10 text-center border-r border-white/5 py-1 font-bold bg-base-300/20 text-info/70">
              {rowLabel}
            </div>
            {hexCols.map((_, colIndex) => {
              const addr = (rowIndex * 16) + colIndex;
              const val = data[addr] || 0;
              const isPC = type === 'code' && addr === pcValue;
              const hasData = type === 'data' && val !== 0;

              return (
                <div 
                  key={colIndex} 
                  className={`flex-1 text-center border-r border-white/5 py-1 transition-all
                    ${isPC ? 'bg-error text-error-content font-bold animate-pulse' : ''}
                    ${hasData ? 'text-success font-bold' : 'text-neutral-content/30'}`}
                >
                  {toHex(val)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-screen w-full bg-base-100 p-2 overflow-y-auto text-xs font-mono select-none flex flex-col gap-3 border-l border-base-300">
      
      {/* 1. TOP SECTION (Registers/Ports) */}
      <div className="flex flex-row gap-3">
        {/* Ports Section */}
        <div className="flex flex-col gap-2 w-1/2">
          <div className="bg-base-200 p-2 border border-base-300 flex justify-between items-center">
            <span className="text-base-content/50 uppercase text-[10px]">Clock</span>
            <span className="text-info font-bold">12.0 MHz</span>
          </div>
          <div className="bg-base-200 p-2 border border-base-300">
            <div className="grid grid-cols-3 text-center text-base-content/50 mb-1 border-b border-base-content/10 pb-1 uppercase text-[10px]">
              <span>pins</span><span>bits</span><span>port</span>
            </div>
            {Object.entries(ports).map(([port, val]) => (
              <div key={port} className="grid grid-cols-3 text-center items-center py-0.5">
                <span className="bg-base-300 border border-base-content/10 mx-1">{val}</span>
                <span className="bg-base-300 border border-base-content/10 mx-1">{val}</span>
                <span className="text-base-content/70 font-bold">{port}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Registers Section */}
        <div className="flex flex-row gap-2 w-1/2 bg-base-200 p-2 border border-base-300">
          <div className="flex flex-col gap-1 w-1/2">
            {Object.entries(regs).map(([reg, val]) => (
              <div key={reg} className="flex justify-between items-center pr-1 border-b border-base-content/5">
                <span className="text-base-content/50 text-[10px]">{reg}</span>
                <span className="text-success">{val}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1 w-1/2 border-l border-base-content/10 pl-2">
            {Object.entries(sfrs).map(([sfr, val]) => (
              <div key={sfr} className="flex justify-between items-center border-b border-base-content/5">
                <span className="text-base-content/50 text-[10px]">{sfr}</span>
                <span className="text-warning">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. MIDDLE SECTION (PC/PSW) */}
      <div className="bg-neutral text-neutral-content p-2 rounded flex flex-col gap-2 shadow-inner">
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-2">
            <span className="text-neutral-content/60 text-[10px] uppercase font-bold">PC</span>
            <span className="text-primary-content bg-primary px-2 py-0.5 rounded text-sm font-bold tracking-widest">{pcDisplay}</span>
          </div>
          <div className="flex gap-1">
            <span className="text-[10px] uppercase font-bold text-neutral-content/60 self-center mr-1">PSW</span>
            {pswBits.map((bit, i) => (
              <div key={i} className={`w-5 h-6 flex items-center justify-center border border-white/10 rounded-sm ${bit ? 'bg-success text-success-content' : 'bg-base-100/10'}`}>
                {bit}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. BOTTOM SECTION (Tabbed Memory) */}
      <div className="bg-base-200 border border-base-300 flex-1 flex flex-col overflow-hidden rounded-md">
        <div className="flex bg-neutral p-1 gap-1">
          <button 
            onClick={() => setActiveTab('data')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase rounded transition-all 
              ${activeTab === 'data' ? 'bg-blue-600 text-white shadow-lg' : 'text-neutral-content/50 hover:bg-white/10'}`}
          >
            DATA MEMORY (RAM)
          </button>
          <button 
            onClick={() => setActiveTab('code')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase rounded transition-all 
              ${activeTab === 'code' ? 'bg-amber-600 text-white shadow-lg' : 'text-neutral-content/50 hover:bg-white/10'}`}
          >
            CODE MEMORY (ROM)
          </button>
        </div>

        <div className="p-2 overflow-y-auto flex-1 bg-black/20">
          {/* NOW USING THE HELPER FUNCTION */}
          {renderMemoryGrid(displayData, activeTab)}
        </div>

        <div className="px-2 py-1 bg-neutral text-[9px] text-neutral-content/40 flex justify-between">
          <span>{activeTab === 'code' ? 'PROGRAM STORAGE' : 'INTERNAL DATA'}</span>
          <span>{activeTab === 'code' ? `PC AT: ${pcDisplay}` : 'BANK 0-3 ACTIVE'}</span>
        </div>
      </div>
    </div>
  );
}