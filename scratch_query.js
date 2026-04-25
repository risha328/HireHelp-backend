const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb+srv://rishamondal328_db_user:Hirehelp123@cluster0.wllgaw6.mongodb.net/');
  const db = mongoose.connection;
  
  const sessions = await db.collection('examsessions').find({ applicationId: new mongoose.Types.ObjectId("69ec68c39da7beaa80ef2790") }).sort({ createdAt: -1 }).toArray();
  console.log("ExamSessions:", JSON.stringify(sessions, null, 2));

  process.exit(0);
}

main().catch(console.error);
