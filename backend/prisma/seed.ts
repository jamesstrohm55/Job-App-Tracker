import { PrismaClient, ApplicationStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a demo user
  const user = await prisma.user.upsert({
    where: { googleId: 'demo-google-id' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      googleId: 'demo-google-id',
      picture: null,
    },
  });

  console.log(`Created user: ${user.email}`);

  // Create sample applications
  const applications = [
    {
      company: 'Stripe',
      position: 'Senior Software Engineer',
      url: 'https://stripe.com/jobs',
      location: 'San Francisco, CA (Remote)',
      salary: '$180k - $250k',
      status: ApplicationStatus.INTERVIEW,
      appliedAt: new Date('2026-02-20'),
      notes: 'Referred by John from college. Had initial phone screen, technical next week.',
    },
    {
      company: 'Vercel',
      position: 'Full Stack Engineer',
      url: 'https://vercel.com/careers',
      location: 'Remote',
      salary: '$150k - $200k',
      status: ApplicationStatus.APPLIED,
      appliedAt: new Date('2026-03-01'),
      notes: 'Applied through their website. Built with Next.js so good fit.',
    },
    {
      company: 'Shopify',
      position: 'Backend Developer',
      url: 'https://shopify.com/careers',
      location: 'Remote (US/Canada)',
      salary: '$160k - $220k',
      status: ApplicationStatus.SCREENING,
      appliedAt: new Date('2026-03-05'),
      notes: 'Recruiter reached out on LinkedIn. Screening call scheduled.',
    },
    {
      company: 'Datadog',
      position: 'Software Engineer - Platform',
      location: 'New York, NY',
      status: ApplicationStatus.SAVED,
      notes: 'Interesting role, need to tailor resume for observability focus.',
    },
    {
      company: 'Notion',
      position: 'Product Engineer',
      url: 'https://notion.so/careers',
      location: 'San Francisco, CA',
      salary: '$170k - $230k',
      status: ApplicationStatus.REJECTED,
      appliedAt: new Date('2026-02-10'),
      notes: 'Got to final round but they went with another candidate.',
    },
    {
      company: 'Linear',
      position: 'Software Engineer',
      url: 'https://linear.app/careers',
      location: 'Remote',
      status: ApplicationStatus.OFFER,
      appliedAt: new Date('2026-02-01'),
      salary: '$165k - $195k',
      notes: 'Offer received! Negotiating salary.',
    },
  ];

  for (const appData of applications) {
    const app = await prisma.application.create({
      data: {
        ...appData,
        userId: user.id,
      },
    });

    // Create initial timeline event
    await prisma.applicationEvent.create({
      data: {
        applicationId: app.id,
        type: 'CREATED',
        description: `Application created with status ${app.status}`,
      },
    });

    // Add status progression events for non-SAVED apps
    if (app.status !== ApplicationStatus.SAVED) {
      await prisma.applicationEvent.create({
        data: {
          applicationId: app.id,
          type: 'STATUS_CHANGE',
          description: `Status changed from SAVED to APPLIED`,
          metadata: { fromStatus: 'SAVED', toStatus: 'APPLIED' },
          createdAt: new Date(app.createdAt.getTime() + 86400000),
        },
      });
    }

    if ([ApplicationStatus.SCREENING, ApplicationStatus.INTERVIEW, ApplicationStatus.OFFER, ApplicationStatus.REJECTED].includes(app.status)) {
      await prisma.applicationEvent.create({
        data: {
          applicationId: app.id,
          type: 'STATUS_CHANGE',
          description: `Status changed from APPLIED to ${app.status === ApplicationStatus.SCREENING ? 'SCREENING' : app.status}`,
          metadata: { fromStatus: 'APPLIED', toStatus: app.status === ApplicationStatus.SCREENING ? 'SCREENING' : app.status },
          createdAt: new Date(app.createdAt.getTime() + 172800000),
        },
      });
    }

    console.log(`  Created application: ${app.company} - ${app.position} (${app.status})`);
  }

  // Create some contacts
  const stripeApp = await prisma.application.findFirst({
    where: { company: 'Stripe', userId: user.id },
  });

  if (stripeApp) {
    await prisma.contact.createMany({
      data: [
        {
          applicationId: stripeApp.id,
          name: 'Sarah Chen',
          email: 'sarah.chen@stripe.com',
          role: 'Engineering Manager',
          notes: 'Hiring manager for the team',
        },
        {
          applicationId: stripeApp.id,
          name: 'Mike Johnson',
          role: 'Senior Recruiter',
          email: 'mike.j@stripe.com',
        },
      ],
    });
    console.log('  Created contacts for Stripe application');
  }

  console.log('\nSeed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
