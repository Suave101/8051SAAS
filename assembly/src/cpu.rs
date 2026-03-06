pub struct Cpu {
    pub a: u8, pub b: u8, pub pc: u16, pub sp: u8, pub psw: u8,
    pub ram: Vec<u8>
}

impl Cpu {
    pub fn new() -> Self {
        Cpu { a: 0, b: 0, pc: 0, sp: 0x07, psw: 0, ram: vec![0; 256] }
    }

    pub fn execute(&mut self, rom: &[u8], max_cycles: usize) {
        let mut cycles = 0; // 2. Keep track of how many instructions we've run

        // Use the Program Counter (PC) as our true instruction pointer
        while (self.pc as usize) < rom.len() {
            // If too many cycles have been executed, stop
            if cycles >= max_cycles {
                break; 
            }
            cycles += 1;

            let opcode = rom[self.pc as usize];
            
            if opcode == 0x00 { // NOP
                self.pc += 1;
            } 
            else if opcode == 0x04 { // INC A
                self.a = self.a.wrapping_add(1);
                self.pc += 1;
            }
            // --- NEW: SJMP (Relative Jump) ---
            else if opcode == 0x80 { 
                if (self.pc as usize) + 1 < rom.len() {
                    let offset = rom[(self.pc as usize) + 1] as i8; // Read as signed byte!
                    self.pc += 2; // Move PC past the instruction
                    // Apply the jump offset
                    self.pc = (self.pc as i32 + offset as i32) as u16; 
                } else { break; }
            }
            // --- REGISTERS ---
            else if opcode >= 0xE8 && opcode <= 0xEF { // MOV A, Rn
                let n = (opcode - 0xE8) as usize;
                self.a = self.ram[n];
                self.pc += 1;
            }
            else if opcode >= 0xF8 && opcode <= 0xFF { // MOV Rn, A
                let n = (opcode - 0xF8) as usize;
                self.ram[n] = self.a;
                self.pc += 1;
            }
            else if opcode >= 0x78 && opcode <= 0x7F { // MOV Rn, #data
                if (self.pc as usize) + 1 < rom.len() {
                    let n = (opcode - 0x78) as usize;
                    self.ram[n] = rom[(self.pc as usize) + 1];
                    self.pc += 2;
                } else { break; }
            }
            // --- MATH ---
            else if opcode >= 0x28 && opcode <= 0x2F { // ADD A, Rn
                let n = (opcode - 0x28) as usize;
                self.a = self.a.wrapping_add(self.ram[n]);
                self.pc += 1;
            }
            else if opcode >= 0x98 && opcode <= 0x9F { // SUBB A, Rn
                let n = (opcode - 0x98) as usize;
                self.a = self.a.wrapping_sub(self.ram[n]);
                self.pc += 1;
            }
            else if opcode == 0x24 { // ADD A, #data
                if (self.pc as usize) + 1 < rom.len() {
                    self.a = self.a.wrapping_add(rom[(self.pc as usize) + 1]);
                    self.pc += 2;
                } else { break; }
            }
            // --- IMMEDIATE & DIRECT ---
            else if opcode == 0x74 { // MOV A, #data
                if (self.pc as usize) + 1 < rom.len() {
                    self.a = rom[(self.pc as usize) + 1];
                    self.pc += 2;
                } else { break; }
            }
            else if opcode == 0xE5 { // MOV A, dir
                if (self.pc as usize) + 1 < rom.len() {
                    let dir = rom[(self.pc as usize) + 1] as usize;
                    self.a = self.ram[dir];
                    self.pc += 2;
                } else { break; }
            }
            else if opcode == 0xF5 { // MOV dir, A
                if (self.pc as usize) + 1 < rom.len() {
                    let dir = rom[(self.pc as usize) + 1] as usize;
                    self.ram[dir] = self.a;
                    self.pc += 2;
                } else { break; }
            }
            else if opcode == 0x75 { // MOV dir, #data
                if (self.pc as usize) + 2 < rom.len() {
                    let dir = rom[(self.pc as usize) + 1] as usize;
                    let data = rom[(self.pc as usize) + 2];
                    self.ram[dir] = data;
                    self.pc += 3;
                } else { break; }
            }
            else { break; } // Safety escape hatch
        }
    }
}