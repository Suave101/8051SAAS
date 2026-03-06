; Set our loop counter (R0) to 3
MOV R0, #03H

; Clear the Accumulator
MOV A, #00H

MULTIPLY:
; Add 5 to A
ADD A, #05H

; Decrement R0, and jump back to MULTIPLY if it isn't zero yet
DJNZ R0, MULTIPLY

; Save our final answer (15, or 0x0F) to the stack
PUSH E0H