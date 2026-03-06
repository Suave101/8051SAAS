use crate::assembler::instruction::InstructionHandler;
use std::collections::HashMap;
use regex::Regex;

pub struct StackCommands {
    re_push: Regex,
    re_pop: Regex,
}

impl StackCommands {
    pub fn new() -> Self {
        Self {
            re_push: Regex::new(r"(?i)^PUSH\s+([0-9A-F]{1,2})H?$").unwrap(),
            re_pop: Regex::new(r"(?i)^POP\s+([0-9A-F]{1,2})H?$").unwrap(),
        }
    }
}

impl InstructionHandler for StackCommands {
    fn check_size(&self, line: &str) -> Option<u16> {
        if self.re_push.is_match(line) || self.re_pop.is_match(line) {
            Some(2) // PUSH and POP are both 2-byte instructions
        } else {
            None
        }
    }

    fn generate(&self, line: &str, _addr: u16, _labels: &HashMap<String, u16>) -> Option<Result<Vec<u8>, String>> {
        if let Some(caps) = self.re_push.captures(line) {
            let dir = u8::from_str_radix(&caps[1], 16).unwrap_or(0);
            return Some(Ok(vec![0xC0, dir]));
        }
        
        if let Some(caps) = self.re_pop.captures(line) {
            let dir = u8::from_str_radix(&caps[1], 16).unwrap_or(0);
            return Some(Ok(vec![0xD0, dir]));
        }

        None
    }
}