const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb+srv://rishamondal328_db_user:Hirehelp123@cluster0.wllgaw6.mongodb.net/');
  const db = mongoose.connection;
  
  // Test with strings
  const stringQuery = await db.collection('examsessions').findOne({
    roundId: "69ec673a9da7beaa80ef2537",
    applicationId: "69ec68c39da7beaa80ef2790",
    candidateId: "69ea2fd2872c43c794470e30"
  });
  console.log("String Query:", !!stringQuery);

  // Test with ObjectIds
  const objIdQuery = await db.collection('examsessions').findOne({
    roundId: new mongoose.Types.ObjectId("69ec673a9da7beaa80ef2537"),
    applicationId: new mongoose.Types.ObjectId("69ec68c39da7beaa80ef2790"),
    candidateId: new mongoose.Types.ObjectId("69ea2fd2872c43c794470e30")
  });
  console.log("ObjectId Query:", !!objIdQuery);

  process.exit(0);
}

main().catch(console.error);
