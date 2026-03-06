use crate::cpu::Cpu;
use crate::cpu::instructions::OpcodeHandler;

pub fn register(table: &mut [OpcodeHandler; 256]) {
    // SJMP rel (0x80)
    table[0x80] = |cpu, _, rom| {
        if let Some(offset) = cpu.fetch_byte(rom, 1) {
            let rel = offset as i8; // Cast to signed 8-bit integer
            cpu.pc += 2; // Move PC past instruction first
            cpu.pc = (cpu.pc as i32 + rel as i32) as u16; // Apply relative offset
            true
        } else { false }
    };

    // DJNZ Rn, rel (0xD8 - 0xDF)
    for op in 0xD8..=0xDF {
        table[op as usize] = |cpu, opcode, rom| {
            if let Some(offset) = cpu.fetch_byte(rom, 1) {
                let n = (opcode - 0xD8) as usize;
                
                // 1. Decrement the target register
                cpu.ram[n] = cpu.ram[n].wrapping_sub(1);
                
                // 2. Move PC past the current instruction (DJNZ is 2 bytes long)
                cpu.pc += 2; 
                
                // 3. Jump if Not Zero
                if cpu.ram[n] != 0 {
                    let rel = offset as i8;
                    cpu.pc = (cpu.pc as i32 + rel as i32) as u16;
                }
                true
            } else { false }
        };
    }
}