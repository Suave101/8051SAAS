use crate::assembler::instruction::InstructionHandler;
use std::collections::HashMap;
use regex::Regex;

pub struct MovCommands {
    re_mov_a_rn: Regex,
    re_mov_rn_a: Regex,
    re_mov_rn_data: Regex,
    re_mov_a_data: Regex,
    re_mov_a_dir: Regex,
    re_mov_dir_a: Regex,
    re_mov_dir_data: Regex,
    re_inc_a: Regex, // Keeping this here so your default text works!
}

impl MovCommands {
    pub fn new() -> Self {
        Self {
            re_mov_a_rn: Regex::new(r"(?i)^MOV\s+A,\s*R([0-7])$").unwrap(),
            re_mov_rn_a: Regex::new(r"(?i)^MOV\s+R([0-7]),\s*A$").unwrap(),
            re_mov_rn_data: Regex::new(r"(?i)^MOV\s+R([0-7]),\s*#([0-9A-F]+)H?$").unwrap(),
            re_mov_a_data: Regex::new(r"(?i)^MOV\s+A,\s*#([0-9A-F]+)H?$").unwrap(),
            re_mov_a_dir: Regex::new(r"(?i)^MOV\s+A,\s*([0-9A-F]{1,2})H?$").unwrap(),
            re_mov_dir_a: Regex::new(r"(?i)^MOV\s+([0-9A-F]{1,2})H?,\s*A$").unwrap(),
            re_mov_dir_data: Regex::new(r"(?i)^MOV\s+([0-9A-F]{1,2})H?,\s*#([0-9A-F]+)H?$").unwrap(),
            re_inc_a: Regex::new(r"(?i)^INC\s+A$").unwrap(),
        }
    }
}

impl InstructionHandler for MovCommands {
    fn check_size(&self, line: &str) -> Option<u16> {
        if self.re_inc_a.is_match(line) || self.re_mov_a_rn.is_match(line) || self.re_mov_rn_a.is_match(line) {
            return Some(1); // 1-byte instructions
        }
        if self.re_mov_rn_data.is_match(line) || self.re_mov_a_data.is_match(line) || 
           self.re_mov_a_dir.is_match(line) || self.re_mov_dir_a.is_match(line) {
            return Some(2); // 2-byte instructions (Opcode + Data/Addr)
        }
        if self.re_mov_dir_data.is_match(line) {
            return Some(3); // 3-byte instructions (Opcode + Addr + Data)
        }
        None
    }

    fn generate(&self, line: &str, _addr: u16, _labels: &HashMap<String, u16>) -> Option<Result<Vec<u8>, String>> {
        if self.re_inc_a.is_match(line) {
            return Some(Ok(vec![0x04]));
        }
        if let Some(caps) = self.re_mov_a_rn.captures(line) {
            let n: u8 = caps[1].parse().unwrap();
            return Some(Ok(vec![0xE8 + n]));
        }
        if let Some(caps) = self.re_mov_rn_a.captures(line) {
            let n: u8 = caps[1].parse().unwrap();
            return Some(Ok(vec![0xF8 + n]));
        }
        if let Some(caps) = self.re_mov_rn_data.captures(line) {
            let n: u8 = caps[1].parse().unwrap();
            let val = u8::from_str_radix(&caps[2], 16).unwrap_or(0);
            return Some(Ok(vec![0x78 + n, val]));
        }
        if let Some(caps) = self.re_mov_a_data.captures(line) {
            let val = u8::from_str_radix(&caps[1], 16).unwrap_or(0);
            return Some(Ok(vec![0x74, val]));
        }
        if let Some(caps) = self.re_mov_a_dir.captures(line) {
            let dir = u8::from_str_radix(&caps[1], 16).unwrap_or(0);
            return Some(Ok(vec![0xE5, dir]));
        }
        if let Some(caps) = self.re_mov_dir_a.captures(line) {
            let dir = u8::from_str_radix(&caps[1], 16).unwrap_or(0);
            return Some(Ok(vec![0xF5, dir]));
        }
        if let Some(caps) = self.re_mov_dir_data.captures(line) {
            let dir = u8::from_str_radix(&caps[1], 16).unwrap_or(0);
            let val = u8::from_str_radix(&caps[2], 16).unwrap_or(0);
            return Some(Ok(vec![0x75, dir, val]));
        }
        None
    }
}