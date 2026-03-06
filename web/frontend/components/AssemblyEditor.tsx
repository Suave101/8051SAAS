'use client';

import { useRef, useEffect, useState } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import init, { Emulator } from 'engine';
import { 
  Cpu, 
  FolderOpen, 
  Save, 
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

  // --- 1. BOOT ENGINE & STYLE INJECTION ---
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

    // Inject PC line highlight CSS
    const style = document.createElement('style');
    style.innerHTML = `
      .pc-highlight {
        background: rgba(59, 130, 246, 0.15);
        border-left: 4px solid #3b82f6;
        width: 100% !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  // --- 2. 8051 SYNTAX HIGHLIGHTING ---
  useEffect(() => {
    if (monaco) {
      monaco.languages.register({ id: '8051' });
      monaco.languages.setMonarchTokensProvider('8051', {
        ignoreCase: true,
        keywords: ['MOV', 'INC', 'DEC', 'ADD', 'ADDC', 'SUBB', 'MUL', 'DIV', 'ANL', 'ORL', 'XRL', 'JMP', 'JZ', 'JNZ', 'CJNE', 'DJNZ', 'NOP', 'RET', 'CLR', 'SETB', 'END'],
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

  // --- 3. EXECUTION LOGIC ---
  const validateCode = (text: string) => {
    if (!isWasmReady || !monaco || !editorRef.current) return;
    
    // Pass the actual editor text (string) to Rust
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

  const updateVisuals = (result: any) => {
    // Send FULL state to dashboard, including the updated ROM bytes
    onRunSuccess({
      a: result.a, b: result.b, pc: result.pc, psw: result.psw, sp: result.sp,
      ram: result.get_ram(),
      rom: result.get_rom() 
    });

    // Update PC Highlight in editor
    if (decorationsRef.current) {
      const sourceMap = emulatorRef.current.get_source_map();
      const lineNum = sourceMap[result.pc];
      if (lineNum) {
        decorationsRef.current.set([{
          range: new monaco.Range(lineNum, 1, lineNum, 1),
          options: { isWholeLine: true, className: 'pc-highlight' }
        }]);
        editorRef.current.revealLineInCenterIfOutsideViewport(lineNum);
      }
    }
  };

  const handleRun = () => {
    if (!isAssembled) return;
    const result = emulatorRef.current.run_all();
    updateVisuals(result);
  };

  const handleStep = () => {
    if (!isAssembled) return;
    const result = emulatorRef.current.step();
    updateVisuals(result);
  };

  const handleReset = () => {
    const text = editorRef.current?.getValue() || "";
    emulatorRef.current.load_code(text); 
    decorationsRef.current?.set([]);
    
    // Clear visualizer but keep ROM loaded
    onRunSuccess({
      a: 0, b: 0, pc: 0, psw: 0, sp: 0x07,
      ram: new Uint8Array(256), 
      rom: emulatorRef.current.get_rom()
    });
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#1e1e1e] border-r border-white/10">
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

      {/* TOP TOOLBAR */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-black shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-600 rounded shadow-md">
            <Cpu size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-[10px] font-black uppercase tracking-widest text-blue-400 leading-none">MCS-51</h1>
            <h2 className="text-sm font-bold text-white leading-tight">Simulator Core</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Group: File Ops */}
          <div className="flex bg-black/30 p-1 rounded border border-white/5 mr-2">
            <button onClick={() => fileInputRef.current?.click()} className="btn btn-ghost btn-xs text-white/70 hover:text-white gap-2">
              <FolderOpen size={14} /> Load
            </button>
            <button 
              onClick={() => {
                const blob = new Blob([editorRef.current?.getValue()], {type: 'text/plain'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'main.asm'; a.click();
              }} 
              className="btn btn-ghost btn-xs text-white/70 hover:text-white gap-2"
            >
              <Save size={14} /> Save
            </button>
          </div>

          {/* Group: Execution */}
          <button onClick={handleReset} className="btn btn-ghost btn-xs text-orange-400 hover:bg-orange-400/10 gap-2">
            <RotateCcw size={14} /> Reset
          </button>
          
          <button onClick={handleStep} className="btn btn-info btn-xs font-bold gap-2 px-3 shadow-md">
            <StepForward size={14} /> Step
          </button>

          <button 
            onClick={handleRun} 
            disabled={!isAssembled}
            className={`btn btn-xs font-bold gap-2 px-6 shadow-md transition-all ${
              isAssembled ? 'btn-success' : 'btn-disabled opacity-20'
            }`}
          >
            <Play size={14} fill="currentColor" /> Run
          </button>
        </div>
      </div>

      {/* ASSEMBLY STATUS BAR */}
      <div className="flex items-center px-4 py-1.5 bg-black/40 text-[10px] border-b border-white/5 font-mono">
        {isAssembled ? (
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 size={12} /> <span className="uppercase tracking-wider">Assembler Ready</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-rose-400 animate-pulse">
            <AlertCircle size={12} /> <span className="uppercase tracking-wider">Syntax Errors Detected</span>
          </div>
        )}
      </div>

      {/* MONACO EDITOR */}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          language="8051"
          theme="vs-dark"
          defaultValue={"; 8051 Assembly\nMOV A, #10H\nMOV R0, #20H\nADD A, R0\nEND"}
          onMount={(editor) => {
            editorRef.current = editor;
            decorationsRef.current = editor.createDecorationsCollection([]);
            validateCode(editor.getValue());
          }}
          onChange={(val) => validateCode(val || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 16,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbersMinChars: 4,
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            padding: { top: 16 }
          }}
        />
      </div>
    </div>
  );
}