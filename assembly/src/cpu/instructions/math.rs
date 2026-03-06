use crate::cpu::Cpu;
use crate::cpu::instructions::OpcodeHandler;

pub fn register(table: &mut [OpcodeHandler; 256]) {
    // ADD A, #data
    table[0x24] = |cpu, _, rom| {
        if let Some(val) = cpu.fetch_byte(rom, 1) {
            let (res, carry) = cpu.a.overflowing_add(val);
            cpu.set_psw_bit(7, carry);
            cpu.a = res;
            cpu.update_parity();
            cpu.pc += 2;
            true
        } else { false }
    };

    // ADD A, Rn
    for op in 0x28..=0x2F {
        table[op as usize] = |cpu, opcode, _| {
            let n = (opcode - 0x28) as usize;
            let (res, carry) = cpu.a.overflowing_add(cpu.ram[n]);
            cpu.set_psw_bit(7, carry);
            cpu.a = res;
            cpu.update_parity();
            cpu.pc += 1;
            true
        };
    }

    // SUBB A, Rn
    for op in 0x98..=0x9F {
        table[op as usize] = |cpu, opcode, _| {
            let n = (opcode - 0x98) as usize;
            let (res, borrow) = cpu.a.overflowing_sub(cpu.ram[n]);
            cpu.set_psw_bit(7, borrow);
            cpu.a = res;
            cpu.update_parity();
            cpu.pc += 1;
            true
        };
    }
}