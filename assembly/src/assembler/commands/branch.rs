use crate::assembler::instruction::InstructionHandler;
use std::collections::HashMap;
use regex::Regex;

pub struct BranchCommands {
    re_sjmp: Regex,
    re_djnz_rn: Regex,
}

impl BranchCommands {
    pub fn new() -> Self {
        Self {
            re_sjmp: Regex::new(r"(?i)^SJMP\s+([A-Z0-9_]+)$").unwrap(),
            re_djnz_rn: Regex::new(r"(?i)^DJNZ\s+R([0-7]),\s*([A-Z0-9_]+)$").unwrap(),
        }
    }
}

impl InstructionHandler for BranchCommands {
    fn check_size(&self, line: &str) -> Option<u16> {
        if self.re_sjmp.is_match(line) || self.re_djnz_rn.is_match(line) {
            return Some(2); // All relative jumps are 2 bytes (Opcode + Offset)
        }
        None
    }

    fn generate(&self, line: &str, addr: u16, labels: &HashMap<String, u16>) -> Option<Result<Vec<u8>, String>> {
        // SJMP
        if let Some(caps) = self.re_sjmp.captures(line) {
            let target = caps[1].to_uppercase();
            if let Some(&target_addr) = labels.get(&target) {
                let offset = (target_addr as i32) - (addr as i32 + 2);
                if offset < -128 || offset > 127 {
                    return Some(Err(format!("SJMP target '{}' is too far (must be -128 to +127 bytes)", target)));
                }
                return Some(Ok(vec![0x80, offset as u8]));
            } else {
                return Some(Err(format!("Unknown label '{}'", target)));
            }
        }

        // DJNZ Rn, label
        if let Some(caps) = self.re_djnz_rn.captures(line) {
            let n: u8 = caps[1].parse().unwrap();
            let target = caps[2].to_uppercase();
            
            if let Some(&target_addr) = labels.get(&target) {
                let offset = (target_addr as i32) - (addr as i32 + 2);
                if offset < -128 || offset > 127 {
                    return Some(Err(format!("DJNZ target '{}' is too far", target)));
                }
                return Some(Ok(vec![0xD8 + n, offset as u8]));
            } else {
                return Some(Err(format!("Unknown label '{}'", target)));
            }
        }

        None
    }
}