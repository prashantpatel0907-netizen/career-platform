// tools/seed-users.cjs
const mongoose = require("mongoose");
const faker = require("@faker-js/faker").faker;
const User = require("../models/User");
const Employer = require("../models/Employer");
require("dotenv").config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB for user seeding.");
  // create employers and workers
  for (let i=0;i<25;i++){
    const email = `employer${i+1}@demo.com`;
    const user = await User.create({ email, passwordHash: await require("bcryptjs").hash("Test1234",10), role:"employer" });
    await Employer.create({ userId: user._id, companyName: `DemoCompany ${Math.floor(i/5)+1}`, contactName: faker.person.fullName() });
  }
  for (let i=0;i<2000;i++){
    const email = `worker${i+1}@demo.com`;
    await User.create({ email, passwordHash: await require("bcryptjs").hash("Test1234",10), role:"worker" });
  }
  console.log("Inserted workers: 2000 employers: 25");
  process.exit(0);
}
main().catch(e=>{console.error(e); process.exit(1)});
