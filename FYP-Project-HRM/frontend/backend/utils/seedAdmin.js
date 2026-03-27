const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Employee = require("../models/Employee");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI);

const seedAdmin = async () => {
  const adminExists = await Employee.findOne({ role: "admin" });
  if (adminExists) {
    console.log("Admin already exists");
    process.exit();
  }

  const hashedPassword = await bcrypt.hash("admin123", 10);

  await Employee.create({
    name: "System Admin",
    email: "admin@gmail.com",
    password: hashedPassword,
    role: "admin",
    department: "IT",
    position: "Administrator",
    hasSystemAccess: true,
    isActive: true
  });

  console.log("Admin created successfully");
  process.exit();
};

seedAdmin();
