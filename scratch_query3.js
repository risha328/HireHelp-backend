const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { getModelToken } = require('@nestjs/mongoose');

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const examSessionModel = app.get(getModelToken('ExamSession'));
  
  const stringQuery = await examSessionModel.findOne({
    roundId: "69ec673a9da7beaa80ef2537",
    applicationId: "69ec68c39da7beaa80ef2790",
    candidateId: "69ea2fd2872c43c794470e30"
  }).sort({ createdAt: -1 }).exec();
  
  console.log("Mongoose String Query Found:", !!stringQuery);
  if (stringQuery) {
    console.log("Answers:", stringQuery.answers);
  }
  
  await app.close();
  process.exit(0);
}

main().catch(console.error);
