use wasm_bindgen::prelude::*;

pub mod assembler;
pub mod cpu;

const ROM_SIZE: usize = 256;

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
    // Property-style getters (wasm-bindgen generates JS getters)
    #[wasm_bindgen(getter)]
    pub fn ram(&self) -> Vec<u8> { self.ram.clone() }

    #[wasm_bindgen(getter)]
    pub fn rom(&self) -> Vec<u8> { self.rom.clone() }

    #[wasm_bindgen(getter)]
    pub fn error(&self) -> String { self.error_message.clone() }

    // Method-style getters kept for JS callers that invoke get_ram/get_rom
    pub fn get_ram(&self) -> Vec<u8> { self.ram.clone() }
    pub fn get_rom(&self) -> Vec<u8> { self.rom.clone() }

    pub fn has_error(&self) -> bool { !self.error_message.is_empty() }
}

#[wasm_bindgen]
pub struct Emulator {
    cpu: cpu::Cpu,
    rom: Vec<u8>,
    pc_to_line: Vec<u32>,
}

impl Default for Emulator {
    fn default() -> Self {
        Self {
            cpu: cpu::Cpu::new(),
        rom: vec![0; ROM_SIZE],
            pc_to_line: Vec::new(),
        }
    }
}

#[wasm_bindgen]
impl Emulator {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Emulator {
        Emulator::default()
    }

    pub fn load_code(&mut self, source_text: &str) -> String {
        self.cpu = cpu::Cpu::new();

        match assembler::assemble(source_text) {
            Ok((mut compiled_rom, source_map)) => {
                compiled_rom.resize(ROM_SIZE, 0);
                self.rom = compiled_rom;
                self.pc_to_line = source_map;
                String::new()
            }
            Err(e) => e,
        }
    }

    pub fn step(&mut self) -> VmResult {
        self.cpu.execute(&self.rom, 1);
        self.current_state()
    }

    pub fn run_all(&mut self) -> VmResult {
        self.cpu.execute(&self.rom, 10_000);
        self.current_state()
    }

    // Call this once after load_code to update the UI's ROM grid
    pub fn get_rom(&self) -> Vec<u8> {
        self.rom.clone()
    }

    pub fn get_source_map(&self) -> Vec<u32> {
        self.pc_to_line.clone()
    }

    fn current_state(&self) -> VmResult {
        VmResult {
            error_message: String::new(),
            rom: self.rom.clone(),
            ram: self.cpu.ram.clone(),
            a: self.cpu.a,
            b: self.cpu.b,
            pc: self.cpu.pc,
            sp: self.cpu.sp,
            psw: self.cpu.psw,
        }
    }
}