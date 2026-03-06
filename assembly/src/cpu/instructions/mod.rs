use crate::cpu::Cpu;

pub mod mov;
pub mod math;
pub mod branch;
pub mod stack;

// Every instruction must be a pure function that takes the CPU state and returns true/false
pub type OpcodeHandler = fn(cpu: &mut Cpu, opcode: u8, rom: &[u8]) -> bool;

pub fn unknown_opcode(_cpu: &mut Cpu, _opcode: u8, _rom: &[u8]) -> bool {
    false // Hitting an unknown opcode halts execution
}

pub fn init_handlers(table: &mut [OpcodeHandler; 256]) {
    mov::register(table);
    math::register(table);
    branch::register(table);
    stack::register(table);

    // We can also drop simple 1-liners directly in here!
    table[0x00] = |cpu, _, _| { cpu.pc += 1; true }; // NOP
    table[0x04] = |cpu, _, _| { // INC A
        cpu.a = cpu.a.wrapping_add(1);
        cpu.update_parity();
        cpu.pc += 1;
        true
    };
}