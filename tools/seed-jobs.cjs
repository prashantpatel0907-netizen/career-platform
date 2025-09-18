// tools/seed-jobs.cjs
const mongoose = require("mongoose");
const faker = require("@faker-js/faker").faker;
const Job = require("../models/Job");
require("dotenv").config();

async function main(){
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB for job seeding.");
  const jobs = [];
  for (let i=0;i<500;i++){
    jobs.push({
      title: faker.helpers.arrayElement(["Driver","Accountant","Frontend Dev","Plumber","Sales Rep","Designer"]) + " #" + (300 + i),
      description: faker.lorem.paragraph(),
      companyId: new mongoose.Types.ObjectId(),
      companyName: `DemoCompany ${Math.floor(i/25)+1}`,
      country: faker.location.country(),
      city: faker.location.city(),
      salaryMin: faker.number.int({min:200, max:400}),
      salaryMax: faker.number.int({min:401, max:800}),
      salaryCurrency: "USD",
      employmentType: faker.helpers.arrayElement(["full-time","part-time","contract"]),
      skills: ["skillA","skillB"].slice(0, faker.number.int({min:1,max:2})),
      remote: faker.datatype.boolean(),
      isActive: true,
      status: faker.helpers.arrayElement(["approved","pending"])
    });
  }
  await Job.insertMany(jobs);
  console.log("Inserted jobs: 500");
  process.exit(0);
}
main().catch(e=>{console.error(e); process.exit(1)});
