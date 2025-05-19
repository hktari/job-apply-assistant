import JobHuntingAgent, { AnalyzedJobPosting, AnalyzedJobListPageItem } from '../jobHuntingAgent';
import { PrismaClient, JobStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

jest.mock('@prisma/client');

describe('JobHuntingAgent', () => {
    let agent: JobHuntingAgent;
    let mockPrismaClient: jest.Mocked<PrismaClient>;

    beforeEach(() => {
        const mockCreate = jest.fn().mockResolvedValue({});
        mockCreate.mockRejectedValueOnce = jest.fn();
        mockPrismaClient = {
            job: {
                create: mockCreate
            }
        } as any;
        agent = new JobHuntingAgent('dummy-api-key');
        (agent as any).prisma = mockPrismaClient;
    });

    describe('mapping logic', () => {
        it('should correctly map AnalyzedJobPosting', async () => {
            const jobPosting: AnalyzedJobPosting = {
                job_title: 'Software Engineer',
                job_link: 'https://example.com/job/123',
                job_posting_id: 'https://example.com/job/123',
                isRelevant: true,
                reasoning: 'Matches skills',
                company: 'Tech Corp',
                role: 'Senior developer position',
                region: 'Remote',
                job_type: 'Full-time',
                experience: '5+ years',
                salary: '100k-120k',
                posted_date: '2025-05-19'
            };

            const mappedJob = (agent as any).mapJobPosting(jobPosting);

            expect(mappedJob).toEqual({
                title: 'Software Engineer',
                company: 'Tech Corp',
                description: 'Senior developer position',
                url: 'https://example.com/job/123',
                source: 'example.com',
                status: JobStatus.PENDING,
                is_relevant: true,
                relevance_reasoning: 'Matches skills',
                region: 'Remote',
                job_type: 'Full-time',
                experience: '5+ years',
                salary: '100k-120k',
                posted_date: new Date('2025-05-19'),
                notes: null
            });
        });

        it('should correctly map AnalyzedJobListPageItem', async () => {
            const jobListItem: AnalyzedJobListPageItem = {
                job_title: 'Frontend Developer',
                job_link: 'https://example.com/job/456',
                isRelevant: false,
                reasoning: 'Different tech stack',
                posted_date_iso: '2025-05-19'
            };

            const mappedJob = (agent as any).mapJobListPageItem(jobListItem);

            expect(mappedJob).toEqual({
                title: 'Frontend Developer',
                company: '',
                description: '',
                url: 'https://example.com/job/456',
                source: 'example.com',
                status: JobStatus.PENDING,
                is_relevant: false,
                relevance_reasoning: 'Different tech stack',
                region: null,
                job_type: null,
                experience: null,
                salary: null,
                posted_date: new Date('2025-05-19'),
                notes: null
            });
        });
    });
});