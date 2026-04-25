const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { getModelToken } = require('@nestjs/mongoose');
const mongoose = require('mongoose');

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const examSessionModel = app.get(getModelToken('ExamSession'));
  
  const objQuery = await examSessionModel.findOne({
    roundId: new mongoose.Types.ObjectId("69ec673a9da7beaa80ef2537"),
    applicationId: new mongoose.Types.ObjectId("69ec68c39da7beaa80ef2790"),
    candidateId: new mongoose.Types.ObjectId("69ea2fd2872c43c794470e30")
  }).sort({ createdAt: -1 }).exec();
  
  console.log("Mongoose Obj Query Found:", !!objQuery);
  if (objQuery) {
    console.log("Answers:", objQuery.answers);
  }
  
  await app.close();
  process.exit(0);
}

main().catch(console.error);
