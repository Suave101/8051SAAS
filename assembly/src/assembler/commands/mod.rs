pub mod math;
pub mod mov;
pub mod branch;
pub mod stack;

use crate::assembler::instruction::InstructionHandler;

// This function returns a list of ALL registered command handlers
pub fn get_all_handlers() -> Vec<Box<dyn InstructionHandler>> {
    vec![
        Box::new(stack::StackCommands::new()),
        Box::new(mov::MovCommands::new()),
        Box::new(math::MathCommands::new()),
        Box::new(branch::BranchCommands::new()),
    ]
}