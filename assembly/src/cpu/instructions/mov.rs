use crate::cpu::Cpu;
use crate::cpu::instructions::OpcodeHandler;

pub fn register(table: &mut [OpcodeHandler; 256]) {
    // MOV A, #data
    table[0x74] = |cpu, _, rom| {
        if let Some(val) = cpu.fetch_byte(rom, 1) {
            cpu.a = val;
            cpu.update_parity();
            cpu.pc += 2;
            true
        } else { false }
    };

    // MOV A, Rn (0xE8 - 0xEF)
    for op in 0xE8..=0xEF {
        table[op as usize] = |cpu, opcode, _| {
            let n = (opcode - 0xE8) as usize;
            cpu.a = cpu.ram[n];
            cpu.update_parity();
            cpu.pc += 1;
            true
        };
    }

    // MOV Rn, A (0xF8 - 0xFF)
    for op in 0xF8..=0xFF {
        table[op as usize] = |cpu, opcode, _| {
            let n = (opcode - 0xF8) as usize;
            cpu.ram[n] = cpu.a;
            cpu.pc += 1;
            true
        };
    }

    // MOV Rn, #data (0x78 - 0x7F)
    for op in 0x78..=0x7F {
        table[op as usize] = |cpu, opcode, rom| {
            if let Some(val) = cpu.fetch_byte(rom, 1) {
                let n = (opcode - 0x78) as usize;
                cpu.ram[n] = val;
                cpu.pc += 2;
                true
            } else { false }
        };
    }

    // MOV A, dir
    table[0xE5] = |cpu, _, rom| {
        if let Some(dir) = cpu.fetch_byte(rom, 1) {
            cpu.a = cpu.ram[dir as usize];
            cpu.update_parity();
            cpu.pc += 2;
            true
        } else { false }
    };

    // MOV dir, A
    table[0xF5] = |cpu, _, rom| {
        if let Some(dir) = cpu.fetch_byte(rom, 1) {
            cpu.ram[dir as usize] = cpu.a;
            cpu.pc += 2;
            true
        } else { false }
    };

    // MOV dir, #data
    table[0x75] = |cpu, _, rom| {
        if let (Some(dir), Some(val)) = (cpu.fetch_byte(rom, 1), cpu.fetch_byte(rom, 2)) {
            cpu.ram[dir as usize] = val;
            cpu.pc += 3;
            true
        } else { false }
    };
}