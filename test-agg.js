const mongoose = require('mongoose');
const uri = 'mongodb+srv://rishamondal328_db_user:Hirehelp123@cluster0.wllgaw6.mongodb.net/';

async function test() {
    try {
        await mongoose.connect(uri);
        console.log('Connected');
        const results = await mongoose.connection.db.collection('companies').aggregate([
            {
                $addFields: {
                    idStr: { $toString: '$_id' }
                }
            },
            {
                $lookup: {
                    from: 'jobs',
                    localField: 'idStr',
                    foreignField: 'companyId',
                    as: 'jobs'
                }
            },
            {
                $lookup: {
                    from: 'applications',
                    localField: 'idStr',
                    foreignField: 'companyId',
                    as: 'applications'
                }
            },
            {
                $addFields: {
                    jobCount: { $size: '$jobs' },
                    applicationCount: { $size: '$applications' }
                }
            },
            {
                $project: {
                    name: 1,
                    jobCount: 1,
                    applicationCount: 1
                }
            }
        ]).toArray();
        console.log('Aggregation results:', JSON.stringify(results, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

test();
