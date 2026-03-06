'use client';

import { useState } from 'react';
import { 
  Activity, 
  Database, 
  Binary, 
  Zap, 
  Cpu, 
  Layers 
} from 'lucide-react';

// Helper to turn numbers into 2-digit hex strings
const toHex = (num: number = 0, padding: number = 2) => 
  (num || 0).toString(16).toUpperCase().padStart(padding, '0');

export default function CpuVisualizer({ cpuState }: { cpuState: any }) {
  const [activeTab, setActiveTab] = useState<'data' | 'code'>('data');

  if (!cpuState) return (
    <div className="h-screen w-full bg-[#1e1e1e] flex items-center justify-center text-white/20 italic font-mono">
      Waiting for Emulator...
    </div>
  );

  // --- 1. DATA MAPPING ---
  const sfrs = {
    B: `0x${toHex(cpuState.b)}`, 
    ACC: `0x${toHex(cpuState.a)}`, 
    PSW: `0x${toHex(cpuState.psw)}`, 
    SP: `0x${toHex(cpuState.sp)}`,
    DPH: `0x${toHex(cpuState.dph || 0)}`, 
    DPL: `0x${toHex(cpuState.dpl || 0)}`, 
    IE: `0x${toHex(cpuState.ie || 0)}`, 
    PCON: `0x${toHex(cpuState.pcon || 0)}`
  };
  
  const pcValue = cpuState.pc || 0;
  const pcDisplay = `0x${toHex(pcValue, 4)}`;

  const regs = {
    R7: `0x${toHex(cpuState.ram?.[7])}`, R6: `0x${toHex(cpuState.ram?.[6])}`, 
    R5: `0x${toHex(cpuState.ram?.[5])}`, R4: `0x${toHex(cpuState.ram?.[4])}`,
    R3: `0x${toHex(cpuState.ram?.[3])}`, R2: `0x${toHex(cpuState.ram?.[2])}`, 
    R1: `0x${toHex(cpuState.ram?.[1])}`, R0: `0x${toHex(cpuState.ram?.[0])}`,
  };

  // PSW Bit Labels for 8051
  const pswLabels = ['CY', 'AC', 'F0', 'RS1', 'RS0', 'OV', '-', 'P'];
  const pswBits = (cpuState.psw || 0).toString(2).padStart(8, '0').split('').map(Number);

  const ports = { 
    P3: `0x${toHex(cpuState.ram?.[0xB0])}`, 
    P2: `0x${toHex(cpuState.ram?.[0xA0])}`, 
    P1: `0x${toHex(cpuState.ram?.[0x90])}`, 
    P0: `0x${toHex(cpuState.ram?.[0x80])}` 
  };

  const hexCols = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
  const displayData = activeTab === 'data' ? (cpuState.ram || new Uint8Array(256)) : (cpuState.rom || new Uint8Array(256));

  // --- 2. THE RENDER HELPER ---
  const renderMemoryGrid = (data: Uint8Array, type: 'data' | 'code') => {
    const rows = Array.from({ length: 16 }, (_, i) => toHex(i * 16));
    
    return (
      <div className="w-full flex flex-col border border-white/5 font-mono text-[10px] bg-black/40 rounded overflow-hidden">
        {/* Header */}
        <div className="flex bg-[#2d2d2d] text-white/40 font-bold border-b border-white/5">
          <div className="w-10 border-r border-white/5 py-1 text-center italic">Addr</div>
          {hexCols.map(col => (
            <div key={col} className="flex-1 text-center border-r border-white/5 py-1">{col}</div>
          ))}
        </div>
        {/* Rows */}
        {rows.map((rowLabel, rowIndex) => (
          <div key={rowLabel} className="flex border-b border-white/5 hover:bg-white/5 transition-colors">
            <div className="w-10 text-center border-r border-white/10 py-1 font-bold bg-white/5 text-blue-400/70">
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
                    ${isPC ? 'bg-blue-600 text-white font-bold animate-pulse shadow-[inset_0_0_10px_rgba(255,255,255,0.3)]' : ''}
                    ${hasData && !isPC ? 'text-emerald-400 font-bold' : !isPC ? 'text-white/20' : ''}`}
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
    <div className="h-screen w-full bg-[#1e1e1e] p-3 overflow-y-auto text-xs font-mono select-none flex flex-col gap-4 border-l border-white/10 shadow-2xl">
      
      {/* 1. TOP SECTION (Clock/Ports & Registers) */}
      <div className="flex flex-row gap-4 h-fit">
        {/* Ports & Clock */}
        <div className="flex flex-col gap-2 w-[40%]">
          <div className="bg-[#2d2d2d] p-2 rounded border border-white/5 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-amber-400" />
              <span className="text-white/40 uppercase text-[9px] font-black tracking-widest">Clock</span>
            </div>
            <span className="text-amber-400 font-bold">12.0 MHz</span>
          </div>

          <div className="bg-[#2d2d2d] rounded border border-white/5 shadow-md overflow-hidden">
            <div className="bg-black/20 px-2 py-1 flex items-center gap-2 border-b border-white/5">
              <Layers size={12} className="text-blue-400" />
              <span className="text-[9px] font-bold text-white/40 uppercase">I/O Ports</span>
            </div>
            <div className="p-2">
              <div className="grid grid-cols-3 text-center text-white/20 mb-2 uppercase text-[9px] font-bold">
                <span>pins</span><span>bits</span><span>port</span>
              </div>
              {Object.entries(ports).map(([port, val]) => (
                <div key={port} className="grid grid-cols-3 text-center items-center py-1 group">
                  <span className="bg-black/40 border border-white/5 rounded mx-1 text-emerald-500/80 group-hover:border-emerald-500/30 transition-colors">{val}</span>
                  <span className="bg-black/40 border border-white/5 rounded mx-1 text-emerald-500/80">{val}</span>
                  <span className="text-white/60 font-bold group-hover:text-white">{port}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Registers (R0-R7 and SFRs) */}
        <div className="flex-1 bg-[#2d2d2d] rounded border border-white/5 shadow-md overflow-hidden flex flex-col">
          <div className="bg-black/20 px-2 py-1 flex items-center gap-2 border-b border-white/5">
            <Database size={12} className="text-emerald-400" />
            <span className="text-[9px] font-bold text-white/40 uppercase">CPU Registers</span>
          </div>
          <div className="flex flex-row gap-0 flex-1">
            <div className="flex flex-col gap-1 w-1/2 p-2">
              {Object.entries(regs).map(([reg, val]) => (
                <div key={reg} className="flex justify-between items-center border-b border-white/5 pb-0.5 group">
                  <span className="text-white/30 text-[10px] group-hover:text-white/50">{reg}</span>
                  <span className="text-emerald-400 font-bold">{val}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1 w-1/2 p-2 bg-black/10 border-l border-white/5">
              {Object.entries(sfrs).map(([sfr, val]) => (
                <div key={sfr} className="flex justify-between items-center border-b border-white/5 pb-0.5 group">
                  <span className="text-white/30 text-[10px] group-hover:text-white/50">{sfr}</span>
                  <span className="text-amber-500 font-bold">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. MIDDLE SECTION (PC/PSW) */}
      <div className="bg-black/40 border border-white/5 p-3 rounded-lg flex flex-col gap-3 shadow-inner">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-white/20 text-[9px] uppercase font-black">Program Counter</span>
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-blue-500" />
                <span className="text-blue-400 text-xl font-black tracking-widest">{pcDisplay}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-[9px] uppercase font-black text-white/20 pr-1">Status Word (PSW)</span>
            <div className="flex gap-1">
              {pswBits.map((bit, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                   <div className={`w-6 h-7 flex items-center justify-center border rounded transition-all duration-300 shadow-sm
                    ${bit ? 'bg-emerald-500 border-emerald-400 text-black font-black' : 'bg-[#1a1a1a] border-white/10 text-white/10'}`}>
                    {bit}
                  </div>
                  <span className="text-[8px] text-white/30 font-bold">{pswLabels[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM SECTION (Tabbed Memory) */}
      <div className="bg-[#2d2d2d] border border-white/5 flex-1 flex flex-col overflow-hidden rounded-xl shadow-2xl">
        <div className="flex bg-black/40 p-1.5 gap-1.5">
          <button 
            onClick={() => setActiveTab('data')}
            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all flex items-center justify-center gap-2
              ${activeTab === 'data' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-white/30 hover:bg-white/5'}`}
          >
            <Database size={12} /> RAM (Data)
          </button>
          <button 
            onClick={() => setActiveTab('code')}
            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all flex items-center justify-center gap-2
              ${activeTab === 'code' ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(217,119,6,0.4)]' : 'text-white/30 hover:bg-white/5'}`}
          >
            <Binary size={12} /> ROM (Code)
          </button>
        </div>

        <div className="p-3 overflow-y-auto flex-1 custom-scrollbar">
          {renderMemoryGrid(displayData, activeTab)}
        </div>

        <div className="px-3 py-2 bg-black/40 border-t border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${activeTab === 'code' ? 'bg-amber-500' : 'bg-blue-500'}`} />
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">
              {activeTab === 'code' ? 'Direct Program Addressing' : 'Internal Data Scratchpad'}
            </span>
          </div>
          <span className="text-[9px] font-mono text-white/20">
            {activeTab === 'code' ? `INST_PTR >> ${pcDisplay}` : 'BANK_SEL >> 00H'}
          </span>
        </div>
      </div>
    </div>
  );
}