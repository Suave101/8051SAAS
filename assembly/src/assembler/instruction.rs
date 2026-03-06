use std::collections::HashMap;

pub trait InstructionHandler {
    /// Returns `Some(size)` if this handler recognizes the assembly line.
    /// Returns `None` if the line belongs to a different command.
    fn check_size(&self, line: &str) -> Option<u16>;

    /// Returns `Some(Ok(bytes))` if successfully compiled.
    /// Returns `Some(Err(msg))` if syntax is bad or label is missing.
    /// Returns `None` if this handler doesn't recognize the command.
    fn generate(&self, line: &str, current_addr: u16, labels: &HashMap<String, u16>) -> Option<Result<Vec<u8>, String>>;
}