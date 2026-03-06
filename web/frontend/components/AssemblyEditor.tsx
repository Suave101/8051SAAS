'use client';

import { useRef, useEffect, useState } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import init, { Emulator } from 'engine';
import { 
  Cpu, 
  FolderOpen, 
  Download, 
  RotateCcw, 
  StepForward, 
  Play, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface EditorProps {
  onRunSuccess: (state: any) => void;
}

export default function AssemblyEditor({ onRunSuccess }: EditorProps) {
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);
  const emulatorRef = useRef<any>(null); 
  const decorationsRef = useRef<any>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isWasmReady, setIsWasmReady] = useState(false);
  const [isAssembled, setIsAssembled] = useState(true);

  // --- 1. BOOT ENGINE & INJECT STYLES ---
  useEffect(() => {
    const setup = async () => {
      try {
        await init();
        emulatorRef.current = new Emulator();
        setIsWasmReady(true);
      } catch (err) {
        console.error("Wasm Boot Failed:", err);
      }
    };
    setup();

    // Injecting the PC highlight style dynamically
    const style = document.createElement('style');
    style.innerHTML = `
      .pc-highlight {
        background: rgba(59, 130, 246, 0.2);
        border-left: 3px solid #3b82f6;
        width: 100% !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  // --- 2. 8051 LANGUAGE DEFINITION ---
  useEffect(() => {
    if (monaco) {
      monaco.languages.register({ id: '8051' });
      monaco.languages.setMonarchTokensProvider('8051', {
        ignoreCase: true,
        keywords: ['MOV', 'INC', 'DEC', 'ADD', 'ADDC', 'SUBB', 'MUL', 'DIV', 'ANL', 'ORL', 'XRL', 'JMP', 'JZ', 'JNZ', 'CJNE', 'DJNZ', 'NOP', 'RET', 'CLR', 'SETB'],
        registers: ['A', 'B', 'R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'DPTR', 'PC', 'PSW', 'SP'],
        tokenizer: {
          root: [
            [/;.*/, 'comment'],
            [/[a-zA-Z_]\w*:/, 'type.identifier'],
            [/#?[0-9A-Fa-f]+H\b/, 'number.hex'],
            [/#?[0-9]+\b/, 'number'],
            [/[a-zA-Z_]\w*/, {
              cases: { '@keywords': 'keyword', '@registers': 'variable.predefined', '@default': 'identifier' }
            }],
          ]
        }
      });
    }
  }, [monaco]);

  // --- 3. LOGIC HANDLERS ---
  const validateCode = (text: string) => {
    if (!isWasmReady || !monaco || !editorRef.current) return;
    
    const errorText = emulatorRef.current.load_code(text);
    const markers: any[] = [];

    if (errorText) {
      setIsAssembled(false);
      const match = errorText.match(/Line (\d+): (.*)/);
      if (match) {
        markers.push({
          startLineNumber: parseInt(match[1]),
          startColumn: 1,
          endLineNumber: parseInt(match[1]),
          endColumn: 100,
          message: match[2],
          severity: monaco.MarkerSeverity.Error,
        });
      }
    } else {
      setIsAssembled(true);
    }

    const model = editorRef.current.getModel();
    if (model) monaco.editor.setModelMarkers(model, "8051", markers);
  };

  const updateEditorHighlight = (pc: number) => {
    if (!decorationsRef.current || !monaco) return;
    const sourceMap = emulatorRef.current.get_source_map();
    const lineNum = sourceMap[pc];

    if (lineNum) {
      decorationsRef.current.set([{
        range: new monaco.Range(lineNum, 1, lineNum, 1),
        options: { isWholeLine: true, className: 'pc-highlight' }
      }]);
      editorRef.current.revealLineInCenterIfOutsideViewport(lineNum);
    }
  };

  const handleRun = () => {
    if (!isAssembled) return;
    const result = emulatorRef.current.run_all();
    onRunSuccess({
      a: result.a, b: result.b, pc: result.pc, psw: result.psw, sp: result.sp,
      ram: result.get_ram(), rom: result.get_rom()
    });
    updateEditorHighlight(result.pc);
  };

  const handleStep = () => {
    const result = emulatorRef.current.step();
    onRunSuccess({
      a: result.a, b: result.b, pc: result.pc, psw: result.psw, sp: result.sp,
      ram: result.get_ram(), rom: result.get_rom()
    });
    updateEditorHighlight(result.pc);
  };

  const handleReset = () => {
    const text = editorRef.current?.getValue() || "";
    emulatorRef.current.load_code(text);
    decorationsRef.current?.set([]);
    onRunSuccess({
      a: 0, b: 0, pc: 0, psw: 0, sp: 0x07,
      ram: new Uint8Array(256), rom: emulatorRef.current.get_rom()
    });
  };

  // --- 4. UI RENDER ---
  return (
    <div className="h-screen w-full flex flex-col bg-[#1e1e1e] border-r border-white/10">
      <input 
        type="file" ref={fileInputRef} className="hidden" 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              editorRef.current?.setValue(ev.target?.result as string);
              handleReset();
            };
            reader.readAsText(file);
          }
        }} 
      />

      {/* TOOLBAR */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-black shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-600 rounded-lg shadow-inner">
            <Cpu size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-[10px] font-black uppercase tracking-widest text-white/40 leading-none">MCS-51</h1>
            <h2 className="text-xs font-bold text-white leading-tight">Assembly Editor</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* File Actions */}
          <div className="flex bg-black/20 p-1 rounded-md border border-white/5 mr-2">
            <button onClick={() => fileInputRef.current?.click()} className="btn btn-ghost btn-xs text-white/60 hover:text-white gap-1.5">
              <FolderOpen size={13} /> Load
            </button>
            <button 
              onClick={() => {
                const blob = new Blob([editorRef.current?.getValue()], {type: 'text/plain'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'code.asm'; a.click();
              }} 
              className="btn btn-ghost btn-xs text-white/60 hover:text-white gap-1.5"
            >
              <Download size={13} /> Save
            </button>
          </div>

          {/* Logic Actions */}
          <button onClick={handleReset} className="btn btn-ghost btn-xs text-orange-400 hover:bg-orange-400/10 gap-1.5">
            <RotateCcw size={13} /> Reset
          </button>
          
          <button onClick={handleStep} className="btn btn-info btn-xs text-[10px] font-bold gap-1.5 shadow-lg px-3">
            <StepForward size={13} /> Step
          </button>

          <button 
            onClick={handleRun} 
            disabled={!isAssembled}
            className={`btn btn-xs text-[10px] font-bold gap-1.5 px-5 shadow-lg transition-all ${
              isAssembled ? 'btn-success' : 'btn-disabled opacity-30'
            }`}
          >
            <Play size={13} fill="currentColor" /> Run
          </button>
        </div>
      </div>

      {/* STATUS BAR */}
      <div className="flex items-center px-4 py-1 bg-black/20 text-[10px] border-b border-white/5">
        {isAssembled ? (
          <div className="flex items-center gap-1.5 text-success">
            <CheckCircle2 size={10} /> <span>Assembler Ready</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-error animate-pulse">
            <AlertCircle size={10} /> <span>Syntax Errors Detected</span>
          </div>
        )}
      </div>

      {/* EDITOR */}
      <div className="flex-1 relative overflow-hidden">
        {!isWasmReady && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#1e1e1e] gap-4">
            <span className="loading loading-ring loading-lg text-primary"></span>
            <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Initializing Wasm...</span>
          </div>
        )}
        <Editor
          height="100%"
          language="8051"
          theme="vs-dark"
          defaultValue={"; Welcome to 8051 IDE\n\nMOV A, #10H\nMOV R0, #20H\nADD A, R0\nEND"}
          onMount={(editor) => {
            editorRef.current = editor;
            decorationsRef.current = editor.createDecorationsCollection([]);
            validateCode(editor.getValue());
          }}
          onChange={(val) => validateCode(val || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 15,
            lineNumbersMinChars: 3,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            padding: { top: 10 }
          }}
        />
      </div>
    </div>
  );
}