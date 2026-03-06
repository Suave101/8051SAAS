'use client';

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Cpu, Play, RotateCcw, SkipForward } from "lucide-react";
import type * as MonacoTypes from "monaco-editor";
import type { OnMount } from "@monaco-editor/react";

// Monaco must be client-only to avoid “window is not defined”
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface AssemblyEditorProps {
  onRunSuccess: (state: any) => void;
}

export default function AssemblyEditor({ onRunSuccess }: AssemblyEditorProps) {
  const editorRef = useRef<MonacoTypes.editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<MonacoTypes.editor.IEditorDecorationsCollection | null>(null);
  const emulatorRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [monaco, setMonaco] = useState<typeof MonacoTypes | null>(null);
  const [isAssembled, setIsAssembled] = useState(false);

  // --- 0. Dynamically load monaco on client only ---
  useEffect(() => {
    let mounted = true;
    if (typeof window !== "undefined") {
      import("monaco-editor").then((m) => {
        if (mounted) setMonaco(m);
      });
    }
    return () => {
      mounted = false;
    };
  }, []);

  // --- 1. LOAD WASM EMULATOR ---
  useEffect(() => {
    (async () => {
      // wasm-pack output exposes a default init fn plus exports
      const wasm = await import("../../../assembly/pkg");
      if (typeof wasm.default === "function") {
        await wasm.default(); // ensure the .wasm module is instantiated
      }
      emulatorRef.current = new wasm.Emulator(); // constructor, not .new()
    })();
  }, []);

  // --- 1b. CUSTOM STYLES (PC Highlight) ---
  useEffect(() => {
    if (typeof document === "undefined") return;
    const style = document.createElement("style");
    style.innerHTML = `
      .pc-highlight {
        background: rgba(59, 130, 246, 0.15);
        border-left: 4px solid #3b82f6;
        width: 100% !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  // --- 2. EDITOR SETUP & SYNTAX HIGHLIGHTING ---
  const onEditorMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    decorationsRef.current = editor.createDecorationsCollection();

    // Register the custom language
    monacoInstance.languages.register({ id: '8051' });

    // Define the syntax highlighting rules
    monacoInstance.languages.setMonarchTokensProvider('8051', {
      ignoreCase: true,
      tokenizer: {
        root: [
          [/\b(MOV|ADD|SUBB|INC|DEC|SJMP|DJNZ|PUSH|POP)\b/, 'keyword'],
          [/\b(A|B|R[0-7]|DPTR|PC|SP|PSW)\b/, 'type'],
          [/#?[0-9A-F]+H\b/, 'number.hex'],
          [/^[a-zA-Z0-9_]+:/, 'identifier'],
          [/;.*/, 'comment'],
        ]
      }
    });

    // Keyboard Shortcuts
    editor.addCommand((monacoInstance?.KeyMod.CtrlCmd || 0) | (monacoInstance?.KeyCode.Enter || 0), handleRun);
    editor.addCommand((monacoInstance?.KeyMod.Shift || 0) | (monacoInstance?.KeyCode.Enter || 0), handleStep);
    editor.addCommand((monacoInstance?.KeyMod.CtrlCmd || 0) | (monacoInstance?.KeyCode.KeyR || 0), handleReset);
  };

  // --- 3. EXECUTION HANDLERS ---
  const handleAssemble = () => {
    if (!editorRef.current || !emulatorRef.current || !monaco) return;

    const code = editorRef.current.getValue();
    const model = editorRef.current.getModel();
    if (!model) return;

    // Call our Rust WASM backend
    const errorString = emulatorRef.current.load_code(code);

    if (errorString.length === 0) {
      // SUCCESS
      setIsAssembled(true);
      monaco.editor.setModelMarkers(model, "8051", []); // Clear old squiggles

      // Grab the compiled ROM and pass the fresh state to the visualizer
      onRunSuccess({
        a: 0, b: 0, pc: 0, sp: 7, psw: 0,
        ram: new Uint8Array(256),
        rom: emulatorRef.current.get_rom() 
      });
    } else {
      // ERROR
      setIsAssembled(false);

      // 🚨 ADD THIS: Let's see exactly what Rust is saying!
      console.log("WASM Error Output:", errorString);

      // Parse the Rust error string to generate red squiggles
      const markers: MonacoTypes.editor.IMarkerData[] = [];
      const lines = errorString.split('\n');
      
      lines.forEach(line => {
        const match = line.match(/Line (\d+): (.*)/);
        if (match) {
          const lineNum = parseInt(match[1], 10);
          const msg = match[2];
          
          markers.push({
            startLineNumber: lineNum,
            endLineNumber: lineNum,
            startColumn: 1,
            endColumn: 100, 
            message: msg,
            severity: monaco.MarkerSeverity.Error,
          });
        }
      });

      monaco.editor.setModelMarkers(model, "8051", markers);
    }
  };

  const updateEditorHighlight = (pc: number) => {
    if (!decorationsRef.current || !monaco) return;
    const sourceMap = emulatorRef.current.get_source_map();
    const lineNum = sourceMap[pc];

    if (lineNum) {
      decorationsRef.current.set([
        {
          range: new monaco.Range(lineNum, 1, lineNum, 1),
          options: { isWholeLine: true, className: "pc-highlight" },
        },
      ]);
      editorRef.current?.revealLineInCenterIfOutsideViewport(lineNum);
    }
  };

  const handleRun = () => {
    if (!isAssembled) return;
    const result = emulatorRef.current.run_all();
    onRunSuccess({
      a: result.a,
      b: result.b,
      pc: result.pc,
      psw: result.psw,
      sp: result.sp,
      ram: result.ram,
      rom: result.rom,
    });
    updateEditorHighlight(result.pc);
  };

  const handleStep = () => {
    const result = emulatorRef.current.step();
    onRunSuccess({
      a: result.a,
      b: result.b,
      pc: result.pc,
      psw: result.psw,
      sp: result.sp,
      ram: result.ram,
      rom: result.rom,
    });
    updateEditorHighlight(result.pc);
  };

  const handleReset = () => {
    const text = editorRef.current?.getValue() || "";
    emulatorRef.current.load_code(text);
    decorationsRef.current?.set([]);
    onRunSuccess({
      a: 0,
      b: 0,
      pc: 0,
      psw: 0,
      sp: 0x07,
      ram: new Uint8Array(256),
      rom: emulatorRef.current.get_rom(),
    });
  };

  // --- 4. UI RENDER ---
  return (
    <div className="h-screen w-full flex flex-col bg-[#1e1e1e] border-r border-white/10">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
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
            <div className="text-white font-semibold">8051 Assembly Playground</div>
            <div className="text-white/40 text-xs">Assemble → Run → Step</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAssemble}
            className="px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded hover:bg-indigo-500 transition"
          >
            Assemble
          </button>
          <button
            onClick={handleRun}
            className="px-3 py-2 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-500 transition flex items-center gap-1 disabled:opacity-40"
            disabled={!isAssembled}
          >
            <Play size={14} /> Run
          </button>
          <button
            onClick={handleStep}
            className="px-3 py-2 bg-amber-600 text-white text-xs font-semibold rounded hover:bg-amber-500 transition flex items-center gap-1 disabled:opacity-40"
            disabled={!isAssembled}
          >
            <SkipForward size={14} /> Step
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-2 bg-gray-700 text-white text-xs font-semibold rounded hover:bg-gray-600 transition flex items-center gap-1"
          >
            <RotateCcw size={14} /> Reset
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 bg-blue-900 text-white text-xs font-semibold rounded hover:bg-blue-800 transition"
          >
            Open .asm
          </button>
        </div>
      </div>

      {/* EDITOR */}
      <div className="flex-1">
        <MonacoEditor
          height="100%"
          language="8051"
          defaultValue={"MOV A, #01H\nINC A\n"}
          theme="vs-dark"
          onMount={onEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontLigatures: true,
            padding: { top: 12 },
          }}
        />
      </div>
    </div>
  );
}