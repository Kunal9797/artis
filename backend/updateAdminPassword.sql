-- Update the admin password to a new bcrypt hash
-- The hash below is for 'password123' using bcrypt with 10 rounds
UPDATE "Users"
SET "password" = '$2b$10$gIAjuvMJkeOXmvQBpM9jF.iZK36H8gEb4OerIICKM2kkF2a8vAFf2', 
    "version" = "version" + 1
WHERE "username" = 'admin'; 