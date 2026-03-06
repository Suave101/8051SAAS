use crate::assembler::instruction::InstructionHandler;
use std::collections::HashMap;
use regex::Regex;

pub struct MathCommands {
    re_add_a_rn: Regex,
    re_add_a_data: Regex,
    re_subb_a_rn: Regex,
}

impl MathCommands {
    pub fn new() -> Self {
        Self {
            re_add_a_rn: Regex::new(r"(?i)^ADD\s+A,\s*R([0-7])$").unwrap(),
            re_add_a_data: Regex::new(r"(?i)^ADD\s+A,\s*#([0-9A-F]+)H?$").unwrap(),
            re_subb_a_rn: Regex::new(r"(?i)^SUBB\s+A,\s*R([0-7])$").unwrap(),
        }
    }
}

impl InstructionHandler for MathCommands {
    fn check_size(&self, line: &str) -> Option<u16> {
        if self.re_add_a_rn.is_match(line) || self.re_subb_a_rn.is_match(line) {
            return Some(1); // Register math is 1 byte
        }
        if self.re_add_a_data.is_match(line) {
            return Some(2); // Immediate math is 2 bytes (Opcode + Data)
        }
        None
    }

    fn generate(&self, line: &str, _addr: u16, _labels: &HashMap<String, u16>) -> Option<Result<Vec<u8>, String>> {
        if let Some(caps) = self.re_add_a_rn.captures(line) {
            let n: u8 = caps[1].parse().unwrap();
            return Some(Ok(vec![0x28 + n]));
        }

        if let Some(caps) = self.re_subb_a_rn.captures(line) {
            let n: u8 = caps[1].parse().unwrap();
            return Some(Ok(vec![0x98 + n]));
        }

        if let Some(caps) = self.re_add_a_data.captures(line) {
            let val = u8::from_str_radix(&caps[1], 16).unwrap_or(0);
            return Some(Ok(vec![0x24, val]));
        }

        None
    }
}