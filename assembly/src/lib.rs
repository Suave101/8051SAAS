use wasm_bindgen::prelude::*;

pub mod assembler;
pub mod cpu;

#[wasm_bindgen]
pub struct VmResult {
    error_message: String,
    rom: Vec<u8>,
    ram: Vec<u8>,
    pub a: u8,
    pub b: u8,
    pub pc: u16,
    pub sp: u8,
    pub psw: u8,
}

#[wasm_bindgen]
impl VmResult {
    pub fn get_rom(&self) -> Vec<u8> { self.rom.clone() }
    pub fn get_ram(&self) -> Vec<u8> { self.ram.clone() }
    pub fn get_error(&self) -> String { self.error_message.clone() }
    pub fn has_error(&self) -> bool { !self.error_message.is_empty() }
}

#[wasm_bindgen]
pub struct Emulator {
    cpu: cpu::Cpu,
    rom: Vec<u8>,
    pc_to_line: Vec<u32>,
}

#[wasm_bindgen]
impl Emulator {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Emulator {
        Emulator {
            cpu: cpu::Cpu::new(),
            rom: vec![0; 256], // Initialize with 256 bytes of empty ROM
            pc_to_line: Vec::new(),
        }
    }

    pub fn load_code(&mut self, source_text: &str) -> String {
        // Reset the CPU state whenever new code is loaded
        self.cpu = cpu::Cpu::new();
        
        match assembler::assemble(source_text) {
            Ok((compiled_rom, source_map)) => {
                self.rom = compiled_rom;
                self.pc_to_line = source_map;
                String::new() // Success: No error message
            },
            Err(e) => e // Return the assembly error string
        }
    }

    pub fn step(&mut self) -> VmResult {
        // 8051 Instructions vary in length. cpu.execute should handle 
        // fetching bytes from self.rom based on the current PC.
        self.cpu.execute(&self.rom, 1); 
        self.get_state()
    }

    pub fn run_all(&mut self) -> VmResult {
        // Safety limit: 10k cycles to prevent browser hang on infinite loops
        self.cpu.execute(&self.rom, 10000); 
        self.get_state()
    }

    pub fn get_rom(&self) -> Vec<u8> {
        self.rom.clone()
    }

    pub fn get_source_map(&self) -> Vec<u32> {
        self.pc_to_line.clone()
    }

    // Internal helper to sync the Rust state to the JS-friendly VmResult
    fn get_state(&self) -> VmResult {
        VmResult {
            error_message: String::new(),
            rom: self.rom.clone(), // This ensures Code Memory tab isn't zero!
            ram: self.cpu.ram.clone(),
            a: self.cpu.a,
            b: self.cpu.b,
            pc: self.cpu.pc,
            sp: self.cpu.sp,
            psw: self.cpu.psw,
        }
    }
}