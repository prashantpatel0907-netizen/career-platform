// tools/set-user-password-manual.cjs
// Usage: node tools/set-user-password-manual.cjs user@example.com NewPass123

const connect = require('../utils/connect'); // project helper used elsewhere
const bcrypt = require('bcryptjs');
const User = require('../models/User');
let Employer, Worker;
try { Employer = require('../models/Employer'); } catch (e) { Employer = null; }
try { Worker = require('../models/Worker'); } catch (e) { Worker = null; }

async function main() {
  const email = process.argv[2];
  const newPass = process.argv[3];
  if (!email || !newPass) {
    console.error('Usage: node tools/set-user-password-manual.cjs user@example.com NewPass123');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await connect(); // should use your existing utils/connect
  console.log('Connected.');

  const user = await User.findOne({ email: email.toLowerCase() }).exec();
  if (!user) {
    console.error('User not found in User collection:', email);
  } else {
    const hash = await bcrypt.hash(newPass, 10);
    // Set field expected by auth route:
    user.password = hash;
    // Also set passwordHash (some models use that)
    if (typeof user.passwordHash !== 'undefined') user.passwordHash = hash;
    await user.save();
    console.log('Updated User document (id=%s) password field.', user._id.toString());
  }

  // Also update Employer collection if it exists
  if (Employer) {
    const emp = await Employer.findOne({ email: email.toLowerCase() }).exec() || await Employer.findOne({ userId: user && user._id }).exec();
    if (emp) {
      if (emp.passwordHash !== undefined) {
        const h = await bcrypt.hash(newPass, 10);
        emp.passwordHash = h;
        await emp.save();
        console.log('Updated Employer passwordHash (id=%s).', emp._id.toString());
      }
    } else {
      console.log('No Employer doc found for that email (or linked user).');
    }
  } else {
    console.log('Employer model not found in project (skipping).');
  }

  // Also update Worker collection if it exists
  if (Worker) {
    const w = await Worker.findOne({ email: email.toLowerCase() }).exec() || await Worker.findOne({ userId: user && user._id }).exec();
    if (w) {
      if (w.passwordHash !== undefined) {
        const h2 = await bcrypt.hash(newPass, 10);
        w.passwordHash = h2;
        await w.save();
        console.log('Updated Worker passwordHash (id=%s).', w._id.toString());
      }
    } else {
      console.log('No Worker doc found for that email (or linked user).');
    }
  } else {
    console.log('Worker model not found in project (skipping).');
  }

  console.log('Done. You can now try login.');
  process.exit(0);
}

main().catch(err => {
  console.error('Error in script:', err && (err.stack || err));
  process.exit(2);
});
