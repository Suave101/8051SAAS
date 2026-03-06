pub mod instructions;

pub struct Cpu {
    pub a: u8,
    pub b: u8,
    pub pc: u16,
    pub sp: u8,
    pub psw: u8,
    pub ram: Vec<u8>,
    // NEW: The Dispatch Table stores a function pointer for all 256 opcodes
    pub(crate) opcode_table: [instructions::OpcodeHandler; 256],
}

impl Cpu {
    pub fn new() -> Self {
        let mut cpu = Cpu {
            a: 0, b: 0, pc: 0, sp: 0x07, psw: 0,
            ram: vec![0; 256],
            // Initialize all 256 slots to a safe "unknown instruction" handler
            opcode_table: [instructions::unknown_opcode; 256], 
        };
        
        // Ask the modular files to register their specific commands into the table
        instructions::init_handlers(&mut cpu.opcode_table);
        cpu
    }

    pub fn set_psw_bit(&mut self, bit: u8, val: bool) {
        if val { self.psw |= 1 << bit; } else { self.psw &= !(1 << bit); }
    }

    pub fn update_parity(&mut self) {
        let count = self.a.count_ones();
        self.set_psw_bit(0, count % 2 != 0);
    }

    pub fn fetch_byte(&self, rom: &[u8], offset: u16) -> Option<u8> {
        rom.get((self.pc + offset) as usize).cloned()
    }

    pub fn execute(&mut self, rom: &[u8], max_cycles: usize) {
        let mut cycles = 0;

        while (self.pc as usize) < rom.len() && cycles < max_cycles {
            let opcode = rom[self.pc as usize];
            cycles += 1;

            // Look up the specific function for this opcode and run it!
            let handler = self.opcode_table[opcode as usize];
            
            // If the handler returns false, it means execution failed (e.g. out of bounds)
            if !handler(self, opcode, rom) {
                break; 
            }
        }
    }
}