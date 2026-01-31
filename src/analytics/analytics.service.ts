import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from '../companies/company.schema';
import { Job, JobDocument } from '../jobs/job.schema';
import { Application, ApplicationDocument } from '../applications/application.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
  ) {}

  async getCompanyGrowth() {
    // Get company growth data over time (monthly)
    const companyGrowth = await this.companyModel.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
      {
        $project: {
          _id: 0,
          period: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: {
                  if: { $lt: ['$_id.month', 10] },
                  then: { $concat: ['0', { $toString: '$_id.month' }] },
                  else: { $toString: '$_id.month' },
                },
              },
            ],
          },
          count: 1,
        },
      },
    ]);

    return companyGrowth;
  }

  async getHiringActivity() {
    // Get hiring activity data (jobs vs applications over time) - weekly
    const jobsData = await this.jobModel.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            week: { $week: '$createdAt' },
          },
          jobsCount: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.week': 1 },
      },
    ]);

    const applicationsData = await this.applicationModel.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            week: { $week: '$createdAt' },
          },
          applicationsCount: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.week': 1 },
      },
    ]);

    // Merge jobs and applications data
    const mergedData: { period: string; jobs: number; applications: number }[] = [];
    const allPeriods = new Set([
      ...jobsData.map(item => `${item._id.year}-W${item._id.week}`),
      ...applicationsData.map(item => `${item._id.year}-W${item._id.week}`),
    ]);

    for (const period of Array.from(allPeriods).sort()) {
      const [year, week] = period.split('-W').map((s, i) => i === 0 ? parseInt(s) : parseInt(s));
      const jobData = jobsData.find(item => item._id.year === year && item._id.week === week);
      const applicationData = applicationsData.find(item => item._id.year === year && item._id.week === week);

      mergedData.push({
        period,
        jobs: jobData ? jobData.jobsCount : 0,
        applications: applicationData ? applicationData.applicationsCount : 0,
      });
    }

    return mergedData;
  }

  async getTopCompanies() {
    // Get top performing companies based on hiring activity score
    // Score = (Job Posts × 2) + Applications + (Successful Hires × 5)
    const topCompanies = await this.companyModel.aggregate([
      {
        $lookup: {
          from: 'jobs',
          localField: '_id',
          foreignField: 'companyId',
          as: 'jobs'
        }
      },
      {
        $lookup: {
          from: 'applications',
          localField: '_id',
          foreignField: 'companyId',
          as: 'applications'
        }
      },
      {
        $addFields: {
          jobCount: { $size: '$jobs' },
          applicationCount: { $size: '$applications' },
          hireCount: {
            $size: {
              $filter: {
                input: '$applications',
                as: 'app',
                cond: { $eq: ['$$app.status', 'hired'] }
              }
            }
          }
        }
      },
      {
        $addFields: {
          score: {
            $add: [
              { $multiply: ['$jobCount', 2] },
              '$applicationCount',
              { $multiply: ['$hireCount', 5] }
            ]
          },
          engagement: {
            $cond: {
              if: { $gt: ['$jobCount', 0] },
              then: {
                $multiply: [
                  { $divide: ['$applicationCount', '$jobCount'] },
                  10
                ]
              },
              else: 0
            }
          }
        }
      },
      {
        $sort: { score: -1 }
      },
      {
        $limit: 5
      },
      {
        $project: {
          _id: 0,
          name: 1,
          jobs: '$jobCount',
          applications: '$applicationCount',
          hires: '$hireCount',
          score: 1,
          engagement: { $round: ['$engagement', 0] }
        }
      }
    ]);

    return topCompanies;
  }
}
