use std::collections::HashMap;
use regex::Regex;

pub fn assemble(source_text: &str) -> Result<(Vec<u8>, Vec<u32>), String> {
    let mut rom: Vec<u8> = Vec::new();
    let mut errors = String::new();
    
    // --- PRE-COMPILE REGEX ---
    let re_label = Regex::new(r"^([A-Z0-9_]+):$").unwrap();
    let re_sjmp = Regex::new(r"^SJMP ([A-Z0-9_]+)$").unwrap();
    
    let re_mov_a_rn = Regex::new(r"^MOV A, R([0-7])$").unwrap();
    let re_mov_rn_a = Regex::new(r"^MOV R([0-7]), A$").unwrap();
    let re_mov_rn_data = Regex::new(r"^MOV R([0-7]), #([0-9A-F]+)H?$").unwrap();
    let re_mov_a_data = Regex::new(r"^MOV A, #([0-9A-F]+)H?$").unwrap();
    let re_mov_a_dir = Regex::new(r"^MOV A, ([0-9A-F]{1,2})H?$").unwrap();
    let re_mov_dir_a = Regex::new(r"^MOV ([0-9A-F]{1,2})H?, A$").unwrap();
    let re_mov_dir_data = Regex::new(r"^MOV ([0-9A-F]{1,2})H?, #([0-9A-F]+)H?$").unwrap();
    
    let re_add_a_rn = Regex::new(r"^ADD A, R([0-7])$").unwrap();
    let re_add_a_data = Regex::new(r"^ADD A, #([0-9A-F]+)H?$").unwrap();
    let re_subb_a_rn = Regex::new(r"^SUBB A, R([0-7])$").unwrap();

    // --- PASS 1: Calculate Instruction Sizes & Store Labels ---
    let mut labels: HashMap<String, u16> = HashMap::new();
    let mut current_addr: u16 = 0;
    let mut parsed_lines = Vec::new(); // Store (LineNumber, Address, Text) for Pass 2

    for (i, line) in source_text.lines().enumerate() {
        let clean = line.split(';').next().unwrap_or("").trim().to_uppercase();
        if clean.is_empty() { continue; }

        if let Some(caps) = re_label.captures(&clean) {
            labels.insert(caps[1].to_string(), current_addr);
        } else {
            parsed_lines.push((i + 1, current_addr, clean.clone()));
            
            // Guess the size of the instruction so we know where the next label lives
            if clean == "NOP" || clean == "INC A" || re_mov_a_rn.is_match(&clean) || re_mov_rn_a.is_match(&clean) || re_add_a_rn.is_match(&clean) || re_subb_a_rn.is_match(&clean) {
                current_addr += 1;
            } else if re_mov_a_data.is_match(&clean) || re_mov_rn_data.is_match(&clean) || re_mov_a_dir.is_match(&clean) || re_mov_dir_a.is_match(&clean) || re_add_a_data.is_match(&clean) || re_sjmp.is_match(&clean) {
                current_addr += 2;
            } else if re_mov_dir_data.is_match(&clean) {
                current_addr += 3;
            } else {
                current_addr += 1; // Unrecognized, assume 1 to keep parsing
            }
        }
    }

    // Add our new Source Map array right before Pass 2
    let mut pc_to_line: Vec<u32> = Vec::new();

    // --- PASS 2: Generate Hex & Resolve Jumps ---
    for (line_num, addr, clean_line) in parsed_lines {
        // Record how big the ROM is BEFORE we process this instruction
        let start_len = rom.len();

        if clean_line == "NOP" { rom.push(0x00); } 
        else if clean_line == "INC A" { rom.push(0x04); }
        // --- NEW: SJMP GENERATION ---
        else if let Some(caps) = re_sjmp.captures(&clean_line) {
            let target_label = &caps[1];
            if let Some(&target_addr) = labels.get(target_label) {
                // Formula: Target - (Current Address + Size of SJMP instruction)
                let offset = (target_addr as i32) - (addr as i32 + 2);
                if offset < -128 || offset > 127 {
                    errors.push_str(&format!("Line {}: SJMP target '{}' out of range\n", line_num, target_label));
                } else {
                    rom.push(0x80); // SJMP Opcode
                    rom.push(offset as u8); // Casts to 2's complement byte!
                }
            } else {
                errors.push_str(&format!("Line {}: Unknown label '{}'\n", line_num, target_label));
            }
        }
        // ... ALL OTHER REGEX PATTERNS ...
        else if let Some(caps) = re_mov_a_rn.captures(&clean_line) {
            let n: u8 = caps[1].parse().unwrap(); rom.push(0xE8 + n);
        } else if let Some(caps) = re_mov_rn_a.captures(&clean_line) {
            let n: u8 = caps[1].parse().unwrap(); rom.push(0xF8 + n);
        } else if let Some(caps) = re_mov_rn_data.captures(&clean_line) {
            let n: u8 = caps[1].parse().unwrap(); let val = u8::from_str_radix(&caps[2], 16).unwrap_or(0);
            rom.push(0x78 + n); rom.push(val);
        } else if let Some(caps) = re_mov_a_data.captures(&clean_line) {
            let val = u8::from_str_radix(&caps[1], 16).unwrap_or(0);
            rom.push(0x74); rom.push(val);
        } else if let Some(caps) = re_mov_a_dir.captures(&clean_line) {
            let dir = u8::from_str_radix(&caps[1], 16).unwrap_or(0);
            rom.push(0xE5); rom.push(dir);
        } else if let Some(caps) = re_mov_dir_a.captures(&clean_line) {
            let dir = u8::from_str_radix(&caps[1], 16).unwrap_or(0);
            rom.push(0xF5); rom.push(dir);
        } else if let Some(caps) = re_mov_dir_data.captures(&clean_line) {
            let dir = u8::from_str_radix(&caps[1], 16).unwrap_or(0); let val = u8::from_str_radix(&caps[2], 16).unwrap_or(0);
            rom.push(0x75); rom.push(dir); rom.push(val);
        } else if let Some(caps) = re_add_a_rn.captures(&clean_line) {
            let n: u8 = caps[1].parse().unwrap(); rom.push(0x28 + n);
        } else if let Some(caps) = re_add_a_data.captures(&clean_line) {
            let val = u8::from_str_radix(&caps[1], 16).unwrap_or(0);
            rom.push(0x24); rom.push(val);
        } else if let Some(caps) = re_subb_a_rn.captures(&clean_line) {
            let n: u8 = caps[1].parse().unwrap(); rom.push(0x98 + n);
        } else {
            errors.push_str(&format!("Line {}: Unknown instruction '{}'\n", line_num, clean_line));
        }

        // See how many bytes we just added, and map them to the line number!
        let bytes_added = rom.len() - start_len;
        for _ in 0..bytes_added {
            pc_to_line.push(line_num as u32);
        }
    }

    if !errors.is_empty() { Err(errors) } else { Ok((rom, pc_to_line)) }
}