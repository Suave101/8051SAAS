'use client';

import Editor, { useMonaco } from '@monaco-editor/react';
import { useRef, useEffect } from 'react';

export default function AssemblyEditor() {
  const monaco = useMonaco();
  const editorRef = useRef(null);

  // This runs right before the editor mounts to the screen
  useEffect(() => {
    if (monaco) {
      // 1. Register a new language ID
      monaco.languages.register({ id: '8051' });

      // 2. Define the syntax highlighting rules (Monarch Tokenizer)
      monaco.languages.setMonarchTokensProvider('8051', {
        ignoreCase: true, // 8051 assembly is usually case-insensitive
        
        // Define all valid 8051 opcodes
        keywords: [
          'MOV', 'MOVC', 'MOVX', 'PUSH', 'POP', 'XCH', 'XCHD', 
          'ADD', 'ADDC', 'SUBB', 'INC', 'DEC', 'MUL', 'DIV', 'DA', 
          'ANL', 'ORL', 'XRL', 'CLR', 'CPL', 'RL', 'RLC', 'RR', 'RRC', 'SWAP', 
          'JC', 'JNC', 'JB', 'JNB', 'JBC', 'JZ', 'JNZ', 'CJNE', 'DJNZ', 
          'ACALL', 'LCALL', 'RET', 'RETI', 'AJMP', 'LJMP', 'SJMP', 'JMP', 'NOP'
        ],
        
        // Define standard registers
        registers: [
          'A', 'B', 'R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 
          'DPTR', 'PC', 'PSW', 'SP', 'ACC'
        ],

        tokenizer: {
          root: [
            // Match Comments (Start with a semicolon)
            [/;.*/, 'comment'],

            // Match Labels (e.g., "LOOP:")
            [/[a-zA-Z_]\w*:/, 'type.identifier'],

            // Match Hex Numbers (e.g., #55H, 0FFH)
            [/#?[0-9A-Fa-f]+H\b/, 'number.hex'],
            
            // Match Binary Numbers (e.g., #01010101B)
            [/#?[01]+B\b/, 'number.binary'],

            // Match Decimal Numbers (e.g., #10)
            [/#?[0-9]+\b/, 'number'],

            // Match Keywords and Registers
            [/[a-zA-Z_]\w*/, {
              cases: {
                '@keywords': 'keyword',       // Colors opcodes blue/purple
                '@registers': 'variable.predefined', // Colors registers light blue
                '@default': 'identifier'      // Default color for unknown words
              }
            }],
          ]
        }
      });
    }
  }, [monaco]);

  // Save the editor instance so we can grab the text later when the user clicks "Run"
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  return (
    <div className="h-screen w-full flex flex-col">
      <div className="bg-gray-800 text-white p-2 font-bold flex justify-between">
        <span>8051 Assembly Editor</span>
        <button 
          className="bg-green-600 px-4 py-1 rounded hover:bg-green-500"
          onClick={() => alert(editorRef.current?.getValue())}
        >
          Run Code
        </button>
      </div>
      
      <Editor
        height="100%"
        defaultLanguage="8051" // Use our newly registered language
        theme="vs-dark"
        defaultValue={"; Write your 8051 assembly here\n\nORG 0000H\nMOV A, #55H\nINC A\nLOOP: SJMP LOOP"}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false }, // Turn off minimap to save space
          fontSize: 16,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
}