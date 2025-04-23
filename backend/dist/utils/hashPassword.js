"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const password = 'pass'; // Replace with your desired password
const saltRounds = 10;
bcrypt_1.default.hash(password, saltRounds).then(hash => {
    console.log('Hashed password:', hash);
});
