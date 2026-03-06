use std::collections::HashMap;
use regex::Regex;

pub fn assemble(source_text: &str) -> Result<(Vec<u8>, Vec<u32>), String> {
    let mut rom: Vec<u8> = Vec::new();
    let mut errors = String::new();
    
    // --- IMPROVED REGEX (Added whitespace flexibility and case insensitivity) ---
    let re_label = Regex::new(r"(?i)^([A-Z0-9_]+):$").unwrap();
    let re_sjmp = Regex::new(r"(?i)^SJMP\s+([A-Z0-9_]+)$").unwrap();
    
    let re_mov_a_rn = Regex::new(r"(?i)^MOV\s+A,\s*R([0-7])$").unwrap();
    let re_mov_rn_a = Regex::new(r"(?i)^MOV\s+R([0-7]),\s*A$").unwrap();
    let re_mov_rn_data = Regex::new(r"(?i)^MOV\s+R([0-7]),\s*#([0-9A-F]+)H?$").unwrap();
    let re_mov_a_data = Regex::new(r"(?i)^MOV\s+A,\s*#([0-9A-F]+)H?$").unwrap();
    let re_mov_a_dir = Regex::new(r"(?i)^MOV\s+A,\s*([0-9A-F]{1,2})H?$").unwrap();
    let re_mov_dir_a = Regex::new(r"(?i)^MOV\s+([0-9A-F]{1,2})H?,\s*A$").unwrap();
    let re_mov_dir_data = Regex::new(r"(?i)^MOV\s+([0-9A-F]{1,2})H?,\s*#([0-9A-F]+)H?$").unwrap();
    
    let re_add_a_rn = Regex::new(r"(?i)^ADD\s+A,\s*R([0-7])$").unwrap();
    let re_add_a_data = Regex::new(r"(?i)^ADD\s+A,\s*#([0-9A-F]+)H?$").unwrap();
    let re_subb_a_rn = Regex::new(r"(?i)^SUBB\s+A,\s*R([0-7])$").unwrap();

    // --- PASS 1: Calculate Instruction Sizes & Store Labels ---
    let mut labels: HashMap<String, u16> = HashMap::new();
    let mut current_addr: u16 = 0;
    let mut parsed_lines = Vec::new(); 

    for (i, line) in source_text.lines().enumerate() {
        let clean = line.split(';').next().unwrap_or("").trim();
        if clean.is_empty() { continue; }

        if let Some(caps) = re_label.captures(clean) {
            labels.insert(caps[1].to_uppercase(), current_addr);
        } else {
            parsed_lines.push((i + 1, current_addr, clean.to_string()));
            
            // Normalize for size checking
            let upper = clean.to_uppercase();
            let size = if upper == "NOP" || upper == "INC A" || re_mov_a_rn.is_match(&upper) || re_mov_rn_a.is_match(&upper) || re_add_a_rn.is_match(&upper) || re_subb_a_rn.is_match(&upper) {
                1
            } else if re_mov_a_data.is_match(&upper) || re_mov_rn_data.is_match(&upper) || re_mov_a_dir.is_match(&upper) || re_mov_dir_a.is_match(&upper) || re_add_a_data.is_match(&upper) || re_sjmp.is_match(&upper) {
                2
            } else if re_mov_dir_data.is_match(&upper) {
                3
            } else {
                1 // Default to 1 to attempt parsing
            };
            current_addr += size;
        }
    }

    let mut pc_to_line: Vec<u32> = Vec::new();

    // --- PASS 2: Generate Hex & Resolve Jumps ---
    for (line_num, addr, raw_line) in parsed_lines {
        let start_len = rom.len();
        let clean = raw_line.to_uppercase();

        if clean == "NOP" { 
            rom.push(0x00); 
        } else if clean == "INC A" { 
            rom.push(0x04); 
        } else if let Some(caps) = re_sjmp.captures(&clean) {
            let target = caps[1].to_uppercase();
            if let Some(&target_addr) = labels.get(&target) {
                let offset = (target_addr as i32) - (addr as i32 + 2);
                if offset < -128 || offset > 127 {
                    errors.push_str(&format!("Line {}: SJMP jump too far\n", line_num));
                } else {
                    rom.push(0x80); 
                    rom.push(offset as u8); 
                }
            } else {
                errors.push_str(&format!("Line {}: Unknown label '{}'\n", line_num, target));
            }
        } else if let Some(caps) = re_mov_a_rn.captures(&clean) {
            let n: u8 = caps[1].parse().unwrap(); 
            rom.push(0xE8 + n);
        } else if let Some(caps) = re_mov_rn_a.captures(&clean) {
            let n: u8 = caps[1].parse().unwrap(); 
            rom.push(0xF8 + n);
        } else if let Some(caps) = re_mov_rn_data.captures(&clean) {
            let n: u8 = caps[1].parse().unwrap();
            let val = u8::from_str_radix(&caps[2], 16).unwrap_or(0);
            rom.push(0x78 + n); rom.push(val);
        } else if let Some(caps) = re_mov_a_data.captures(&clean) {
            let val = u8::from_str_radix(&caps[1], 16).unwrap_or(0);
            rom.push(0x74); rom.push(val);
        } else if let Some(caps) = re_mov_a_dir.captures(&clean) {
            let dir = u8::from_str_radix(&caps[1], 16).unwrap_or(0);
            rom.push(0xE5); rom.push(dir);
        } else if let Some(caps) = re_mov_dir_a.captures(&clean) {
            let dir = u8::from_str_radix(&caps[1], 16).unwrap_or(0);
            rom.push(0xF5); rom.push(dir);
        } else if let Some(caps) = re_mov_dir_data.captures(&clean) {
            let dir = u8::from_str_radix(&caps[1], 16).unwrap_or(0);
            let val = u8::from_str_radix(&caps[2], 16).unwrap_or(0);
            rom.push(0x75); rom.push(dir); rom.push(val);
        } else if let Some(caps) = re_add_a_rn.captures(&clean) {
            let n: u8 = caps[1].parse().unwrap(); 
            rom.push(0x28 + n);
        } else if let Some(caps) = re_add_a_data.captures(&clean) {
            let val = u8::from_str_radix(&caps[1], 16).unwrap_or(0);
            rom.push(0x24); rom.push(val);
        } else if let Some(caps) = re_subb_a_rn.captures(&clean) {
            let n: u8 = caps[1].parse().unwrap(); 
            rom.push(0x98 + n);
        } else {
            errors.push_str(&format!("Line {}: Syntax Error '{}'\n", line_num, clean));
        }

        // --- SOURCE MAPPING ---
        let bytes_added = rom.len() - start_len;
        for _ in 0..bytes_added {
            pc_to_line.push(line_num as u32);
        }
    }

    if !errors.is_empty() { Err(errors) } else { Ok((rom, pc_to_line)) }
}