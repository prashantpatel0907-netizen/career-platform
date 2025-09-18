// backend/tools/seed-demo.cjs
const connectDB = require('../utils/connect');
const User = require('../models/User');
const Employer = require('../models/Employer');
const Job = require('../models/Job');
const Wallet = require('../models/Wallet');
const bcrypt = require('bcryptjs');

async function main(){
  await connectDB();
  console.log('Connected');

  const pw = 'Test1234';
  const hashed = await bcrypt.hash(pw, 10);

  // create employer user
  let empUser = await User.findOne({ email: 'demo-emp@demo.com' });
  if(!empUser){
    empUser = await User.create({ email:'demo-emp@demo.com', passwordHash:hashed, role:'employer' });
    await Employer.create({ userId: empUser._id, companyName: 'DemoCo', contactName: 'Demo' });
    console.log('Created employer demo-emp@demo.com /', pw);
  } else console.log('Employer exists:', empUser.email);

  // create worker user
  let worker = await User.findOne({ email: 'demo-worker@demo.com' });
  if(!worker){
    worker = await User.create({ email:'demo-worker@demo.com', passwordHash:hashed, role:'worker' });
    console.log('Created worker demo-worker@demo.com /', pw);
  } else console.log('Worker exists:', worker.email);

  // create job
  let job = await Job.findOne({ title: 'Demo job (seed)' });
  if(!job){
    job = await Job.create({ title: 'Demo job (seed)', description:'Seed job', companyId: String(empUser._id), companyName:'DemoCo', isActive:true, status:'pending' });
    console.log('Created job id', job._id.toString());
  } else console.log('Job exists:', job._id.toString());

  // wallet
  let w = await Wallet.findOne({ ownerId: String(empUser._id) });
  if(!w){
    w = await Wallet.create({ ownerId: String(empUser._id), ownerType:'employer', balance: 100 });
    console.log('Created wallet for employer with balance 100');
  } else console.log('Wallet exists');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
