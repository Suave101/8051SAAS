use crate::cpu::Cpu;
use crate::cpu::instructions::OpcodeHandler;

pub fn register(table: &mut [OpcodeHandler; 256]) {
    // PUSH dir (0xC0)
    table[0xC0] = |cpu, _, rom| {
        if let Some(dir) = cpu.fetch_byte(rom, 1) {
            // 8051 Stack grows UP. Pre-increment SP.
            cpu.sp = cpu.sp.wrapping_add(1);
            
            // Read from the direct address and push to the stack
            let val = cpu.ram[dir as usize];
            cpu.ram[cpu.sp as usize] = val;
            
            cpu.pc += 2;
            true
        } else { false }
    };

    // POP dir (0xD0)
    table[0xD0] = |cpu, _, rom| {
        if let Some(dir) = cpu.fetch_byte(rom, 1) {
            // Pop from stack and write to direct address
            let val = cpu.ram[cpu.sp as usize];
            cpu.ram[dir as usize] = val;
            
            // Post-decrement SP
            cpu.sp = cpu.sp.wrapping_sub(1);
            
            cpu.pc += 2;
            true
        } else { false }
    };
}