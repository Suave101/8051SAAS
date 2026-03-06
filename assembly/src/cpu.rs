pub struct Cpu {
    pub a: u8,
    pub b: u8,
    pub pc: u16,
    pub sp: u8,
    pub psw: u8,
    pub ram: Vec<u8>,
}

impl Cpu {
    pub fn new() -> Self {
        Cpu {
            a: 0,
            b: 0,
            pc: 0,
            sp: 0x07, // Default 8051 Stack Pointer
            psw: 0,
            ram: vec![0; 256],
        }
    }

    // --- INTERNAL HELPERS ---

    fn set_psw_bit(&mut self, bit: u8, val: bool) {
        if val { self.psw |= 1 << bit; }
        else { self.psw &= !(1 << bit); }
    }

    fn update_parity(&mut self) {
        // Parity flag (bit 0) is set if Accumulator has odd number of 1s
        let count = self.a.count_ones();
        self.set_psw_bit(0, count % 2 != 0);
    }

    fn fetch_byte(&self, rom: &[u8], offset: u16) -> Option<u8> {
        rom.get((self.pc + offset) as usize).cloned()
    }

    // --- MAIN EXECUTION ---

    pub fn execute(&mut self, rom: &[u8], max_cycles: usize) {
        let mut cycles = 0;

        while (self.pc as usize) < rom.len() && cycles < max_cycles {
            let opcode = rom[self.pc as usize];
            cycles += 1;

            match opcode {
                // NOP
                0x00 => self.pc += 1,

                // INC A
                0x04 => {
                    self.a = self.a.wrapping_add(1);
                    self.update_parity();
                    self.pc += 1;
                }

                // SJMP (Relative Jump)
                0x80 => {
                    if let Some(offset) = self.fetch_byte(rom, 1) {
                        let rel = offset as i8;
                        self.pc += 2;
                        self.pc = (self.pc as i32 + rel as i32) as u16;
                    } else { break; }
                }

                // MOV A, #data
                0x74 => {
                    if let Some(val) = self.fetch_byte(rom, 1) {
                        self.a = val;
                        self.update_parity();
                        self.pc += 2;
                    } else { break; }
                }

                // MOV A, Rn (0xE8 - 0xEF)
                0xE8..=0xEF => {
                    let n = (opcode - 0xE8) as usize;
                    self.a = self.ram[n];
                    self.update_parity();
                    self.pc += 1;
                }

                // MOV Rn, A (0xF8 - 0xFF)
                0xF8..=0xFF => {
                    let n = (opcode - 0xF8) as usize;
                    self.ram[n] = self.a;
                    self.pc += 1;
                }

                // MOV Rn, #data (0x78 - 0x7F)
                0x78..=0x7F => {
                    if let Some(val) = self.fetch_byte(rom, 1) {
                        let n = (opcode - 0x78) as usize;
                        self.ram[n] = val;
                        self.pc += 2;
                    } else { break; }
                }

                // MOV A, dir
                0xE5 => {
                    if let Some(dir) = self.fetch_byte(rom, 1) {
                        self.a = self.ram[dir as usize];
                        self.update_parity();
                        self.pc += 2;
                    } else { break; }
                }

                // MOV dir, A
                0xF5 => {
                    if let Some(dir) = self.fetch_byte(rom, 1) {
                        self.ram[dir as usize] = self.a;
                        self.pc += 2;
                    } else { break; }
                }

                // MOV dir, #data
                0x75 => {
                    if let (Some(dir), Some(val)) = (self.fetch_byte(rom, 1), self.fetch_byte(rom, 2)) {
                        self.ram[dir as usize] = val;
                        self.pc += 3;
                    } else { break; }
                }

                // ADD A, #data
                0x24 => {
                    if let Some(val) = self.fetch_byte(rom, 1) {
                        let (res, carry) = self.a.overflowing_add(val);
                        // Simplified PSW update (Carry flag is bit 7)
                        self.set_psw_bit(7, carry);
                        self.a = res;
                        self.update_parity();
                        self.pc += 2;
                    } else { break; }
                }

                // ADD A, Rn
                0x28..=0x2F => {
                    let n = (opcode - 0x28) as usize;
                    let (res, carry) = self.a.overflowing_add(self.ram[n]);
                    self.set_psw_bit(7, carry);
                    self.a = res;
                    self.update_parity();
                    self.pc += 1;
                }

                // SUBB A, Rn
                0x98..=0x9F => {
                    let n = (opcode - 0x98) as usize;
                    let (res, borrow) = self.a.overflowing_sub(self.ram[n]);
                    self.set_psw_bit(7, borrow);
                    self.a = res;
                    self.update_parity();
                    self.pc += 1;
                }

                _ => break, // Unknown Opcode
            }
        }
    }
}