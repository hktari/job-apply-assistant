# Job Scrape Agent

A Node.js application to scrape job postings and analyze their relevance based on a user's profile.

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```bash
   cd job-scrape-agent
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## Usage

Run the application using:

```bash
npm start
```

## Configuration

The agent's behavior can be configured by modifying the `src/profile.json` file. This file contains the user's skills, experience, and job preferences, which are used by the `jobRelevanceAnalyzer.ts` to determine the suitability of a job posting.
