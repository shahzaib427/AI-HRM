const mongoose = require('mongoose');
const Payroll = require('./models/Payroll');
const User = require('./models/User');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const broken = await Payroll.find({
    $or: [
      { employeeName: { $in: ['', null] } },
      { month: { $in: ['', null] } }
    ]
  });

  console.log(`Found ${broken.length} broken payroll records\n`);

  for (const p of broken) {
    console.log('--- Payroll', p._id.toString(), '---');
    console.log('employeeId:', p.employeeId, ' month:', JSON.stringify(p.month), ' year:', p.year);
    console.log('createdAt:', p.createdAt);

    const user = p.employeeId ? await User.findById(p.employeeId) : null;
    console.log('linked User exists:', !!user);
    if (user) {
      console.log('  User.name:', user.name, ' employeeId:', user.employeeId, ' department:', user.department, ' salary:', user.salary);
    }
    console.log();
  }

  await mongoose.disconnect();
  process.exit(0);
})();