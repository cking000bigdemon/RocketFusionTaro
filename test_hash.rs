use bcrypt::{hash, verify, DEFAULT_COST};

fn main() {
    let password = "admin123";
    let hashed = hash(password, DEFAULT_COST).unwrap();
    println!("Generated hash for 'admin123': {}", hashed);
    
    let stored_hash = "$2a$10$Tz0HqGNzgv8fQXTqGDKSUu.kzPQ3jLZ6dKS8tJHb7jGV.yfWmZo3e";
    let is_valid = verify(password, stored_hash).unwrap_or(false);
    println!("Verification result: {}", is_valid);
}