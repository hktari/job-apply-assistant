dotenv.config();

import dotenv from 'dotenv';

import JobHuntingAgent from './jobHuntingAgent.js';

async function main() {
    const firecrawlKey = process.env.FIRECRAWL_API_KEY;
    if (!firecrawlKey) {
        console.error('Missing FIRECRAWL_API_KEY in environment variables.');
        process.exit(1);
    }
    const agent = new JobHuntingAgent(firecrawlKey);

    // Example URLs - replace with actual URLs or load them from a config
    const jobListUrls = [
        "https://slo-tech.com/delo",
        "https://www.bettercareer.si/jobs",
        "https://www.optius.com/iskalci/prosta-delovna-mesta/?Keywords=&amp;Fields%5B%5D=37&amp;doSearch=&amp;Time=",
        "https://www.optius.com/iskalci/prosta-delovna-mesta/?Keywords=&amp;Fields%5B%5D=42&amp;doSearch=&amp;Time=",
        "https://weworkremotely.com/remote-react-jobs",
        "https://weworkremotely.com/remote-javascript-jobs",
        "https://weworkremotely.com/remote-node-jobs",
        "https://weworkremotely.com/remote-angular-jobs",
        "https://weworkremotely.com/remote-full-time-jobs",
    ];

    if (jobListUrls.length === 0) {
        console.log("No job list URLs provided. Exiting.");
        process.exit(0);
    }

    const result = await agent.findJobs(jobListUrls);
    console.log("Job search completed.");
    console.log("Matched Jobs:", result.matchedJobs.length);
    console.log("Irrelevant Jobs:", result.irrelevantJobs.length);

    // update database
    await agent.storeJobsInDatabase(result.matchedJobs, result.irrelevantJobs);
}

main();
