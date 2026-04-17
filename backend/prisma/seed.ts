import 'dotenv/config';

import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { performance } from 'node:perf_hooks';

const prisma = new PrismaClient();

type CollegeDefinition = {
  id: string;
  name: string;
  subdomain: string;
  location: string;
  code: string;
};

type SeedTarget =
  | 'colleges'
  | 'admins'
  | 'students'
  | 'alumni'
  | 'events'
  | 'opportunities';

type CliOptions = {
  collegeIds: Set<string> | null;
  only: Set<SeedTarget> | null;
  dryRun: boolean;
};

type SeedConfig = {
  studentsPerCollege: number;
  alumniPerCollege: number;
  hashRounds: number;
  chunkSize: number;
  currentYear: number;
  batchYears: number[];
};

type SeedPasswords = {
  student: string;
  admin: string;
};

type StudentSeedRow = {
  collegeId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  department: string;
  year: number;
  rollNumber: string;
  phone: string;
  bio: string;
  headline: string;
  location: string;
  skills: string;
  profileLinks: Prisma.InputJsonValue;
  isActive: boolean;
  isApproved: boolean;
};

type AlumniSeedRow = {
  collegeId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  department: string;
  graduationYear: number;
  company: string;
  designation: string;
  phone: string;
  bio: string;
  headline: string;
  location: string;
  skills: string;
  profileLinks: Prisma.InputJsonValue;
  availableMentorship: boolean;
  availableReferral: boolean;
  status: string;
  isActive: boolean;
  isApproved: boolean;
};

type CollegeSeedRow = {
  id: string;
  name: string;
  subdomain: string;
  location: string;
  code: string;
  isActive: boolean;
  metadata: Record<string, never>;
};

type AdminSeedRow = {
  collegeId: string;
  email: string;
  username: string;
  fullName: string;
  passwordHash: string;
  isActive: boolean;
};

type EventSeedRow = {
  collegeId: string;
  title: string;
  description: string;
  eventType: string;
  location: string;
  eventDate: Date;
  maxCapacity: number;
  status: string;
  targetColleges: string[];
  isGlobal: boolean;
};

type OpportunitySeedRow = {
  collegeId: string;
  title: string;
  company: string;
  location: string;
  jobType: string;
  description: string;
  skillsRequired: string;
  salary: string;
  status: string;
  openingsCount: number;
  isGlobal: boolean;
  targetColleges: string[];
};

const DEFAULT_COLLEGES: readonly CollegeDefinition[] = [
  {
    id: 'skit',
    name: 'SKIT College of Engineering',
    subdomain: 'skit',
    location: 'Jaipur, Rajasthan',
    code: 'SKIT',
  },
  {
    id: 'nps',
    name: 'National Public School',
    subdomain: 'nps',
    location: 'Bangalore, Karnataka',
    code: 'NPS',
  },
  {
    id: 'christ',
    name: 'Christ University',
    subdomain: 'christ',
    location: 'Bangalore, Karnataka',
    code: 'CHRIST',
  },
  {
    id: 'rv',
    name: 'RV College of Engineering',
    subdomain: 'rv',
    location: 'Bangalore, Karnataka',
    code: 'RVCE',
  },
] as const;

const DEPARTMENTS = ['CSE', 'ISE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'MBA', 'MCA'];
const COMPANIES = [
  'Google',
  'Amazon',
  'Microsoft',
  'Infosys',
  'TCS',
  'Wipro',
  'Deloitte',
  'Accenture',
  'Flipkart',
  'Swiggy',
];
const DESIGNATIONS = [
  'Software Engineer',
  'Senior SWE',
  'Tech Lead',
  'Product Manager',
  'Data Scientist',
  'Cloud Architect',
  'DevOps Engineer',
  'QA Engineer',
];
const LOCATIONS = [
  'Bangalore',
  'Hyderabad',
  'Pune',
  'Chennai',
  'Mumbai',
  'Delhi',
  'Noida',
  'Gurugram',
];

const SEED_TARGETS: readonly SeedTarget[] = [
  'colleges',
  'admins',
  'students',
  'alumni',
  'events',
  'opportunities',
];

const TARGET_ALIASES: Record<string, SeedTarget> = {
  college: 'colleges',
  colleges: 'colleges',
  admin: 'admins',
  admins: 'admins',
  student: 'students',
  students: 'students',
  alumni: 'alumni',
  alumnus: 'alumni',
  event: 'events',
  events: 'events',
  opportunity: 'opportunities',
  opportunities: 'opportunities',
};

function createConfig(): SeedConfig {
  const currentYear = new Date().getFullYear();
  return {
    studentsPerCollege: readPositiveInt('STUDENTS_PER_COLLEGE', 500),
    alumniPerCollege: readPositiveInt('ALUMNI_PER_COLLEGE', 500),
    hashRounds: readPositiveInt('HASH_ROUNDS', 10),
    chunkSize: readPositiveInt('SEED_CHUNK_SIZE', 200),
    currentYear,
    batchYears: Array.from({ length: 5 }, (_, index) => currentYear - index),
  };
}

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value) || value <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer. Received "${raw}".`);
  }

  return value;
}

function parseCliOptions(args: string[]): CliOptions {
  let collegeIds: Set<string> | null = null;
  let only: Set<SeedTarget> | null = null;
  let dryRun = false;

  for (const arg of args) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (arg.startsWith('--college=')) {
      const values = arg
        .slice('--college='.length)
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

      if (values.length === 0) {
        throw new Error('The --college flag requires at least one college id.');
      }

      collegeIds = new Set(values);
      continue;
    }

    if (arg.startsWith('--only=')) {
      const values = arg
        .slice('--only='.length)
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

      if (values.length === 0) {
        throw new Error('The --only flag requires at least one seed target.');
      }

      only = new Set(values.map(normalizeTarget));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { collegeIds, only, dryRun };
}

function normalizeTarget(value: string): SeedTarget {
  const normalized = TARGET_ALIASES[value];
  if (!normalized) {
    throw new Error(
      `Unsupported seed target "${value}". Valid values: ${SEED_TARGETS.join(', ')}.`,
    );
  }

  return normalized;
}

function selectColleges(options: CliOptions): CollegeDefinition[] {
  if (!options.collegeIds) {
    return [...DEFAULT_COLLEGES];
  }

  const colleges = DEFAULT_COLLEGES.filter((college) => options.collegeIds?.has(college.id));
  const missing = Array.from(options.collegeIds).filter(
    (collegeId) => !DEFAULT_COLLEGES.some((college) => college.id === collegeId),
  );

  if (missing.length > 0) {
    throw new Error(`Unknown college ids: ${missing.join(', ')}.`);
  }

  return colleges;
}

function shouldSeed(options: CliOptions, target: SeedTarget): boolean {
  return options.only ? options.only.has(target) : true;
}

function pad(value: number, length = 4): string {
  return String(value).padStart(length, '0');
}

function randomIndex(length: number): number {
  return Math.floor(Math.random() * length);
}

function pick<T>(values: readonly T[]): T {
  return values[randomIndex(values.length)];
}

function randomPhone(prefix: string): string {
  return `${prefix}${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;
}

function formatMs(value: number): string {
  if (value < 1000) return `${value.toFixed(0)}ms`;
  return `${(value / 1000).toFixed(2)}s`;
}

function log(message: string): void {
  console.log(`[seed] ${message}`);
}

function logCollege(collegeId: string, message: string): void {
  log(`[${collegeId}] ${message}`);
}

async function withTiming<T>(label: string, action: () => Promise<T>): Promise<T> {
  const start = performance.now();
  log(`${label} started`);
  try {
    const result = await action();
    log(`${label} completed in ${formatMs(performance.now() - start)}`);
    return result;
  } catch (error) {
    log(`${label} failed after ${formatMs(performance.now() - start)}`);
    throw error;
  }
}

async function preparePasswords(hashRounds: number): Promise<SeedPasswords> {
  const [student, admin] = await Promise.all([
    bcrypt.hash('secret123', hashRounds),
    bcrypt.hash('admin123', hashRounds),
  ]);

  return { student, admin };
}

async function createManyInChunks<T extends object>(params: {
  total: number;
  chunkSize: number;
  buildRow: (index: number) => T;
  insert: (rows: T[]) => Promise<number>;
  dryRun?: boolean;
}): Promise<{ inserted: number; total: number; chunks: number }> {
  let inserted = 0;
  let chunks = 0;

  for (let offset = 0; offset < params.total; offset += params.chunkSize) {
    const size = Math.min(params.chunkSize, params.total - offset);
    const rows: T[] = [];

    for (let index = 0; index < size; index += 1) {
      rows.push(params.buildRow(offset + index));
    }

    chunks += 1;

    if (!params.dryRun) {
      inserted += await params.insert(rows);
    }
  }

  return {
    inserted: params.dryRun ? params.total : inserted,
    total: params.total,
    chunks,
  };
}

function buildStudentRow(params: {
  collegeId: string;
  index: number;
  passwordHash: string;
  batchYears: number[];
}): StudentSeedRow {
  const serial = params.index + 1;
  const department = pick(DEPARTMENTS);
  const year = pick(params.batchYears);

  return {
    collegeId: params.collegeId,
    email: `student${pad(serial)}.${params.collegeId}@alumni.local`,
    passwordHash: params.passwordHash,
    fullName: `Student ${pad(serial)} ${params.collegeId.toUpperCase()}`,
    department,
    year,
    rollNumber: `${params.collegeId.toUpperCase()}${year}${pad(serial)}`,
    phone: randomPhone('98'),
    bio: `${department} student at ${params.collegeId.toUpperCase()}, batch ${year}.`,
    headline: `${department} student`,
    location: pick(LOCATIONS),
    skills: 'Python,JavaScript,SQL',
    profileLinks: [],
    isActive: true,
    isApproved: true,
  };
}

function buildAlumniRow(params: {
  collegeId: string;
  index: number;
  passwordHash: string;
  batchYears: number[];
}): AlumniSeedRow {
  const serial = params.index + 1;
  const department = pick(DEPARTMENTS);
  const graduationYear = pick(params.batchYears);
  const company = pick(COMPANIES);
  const designation = pick(DESIGNATIONS);
  const location = pick(LOCATIONS);

  return {
    collegeId: params.collegeId,
    email: `alumni${pad(serial)}.${params.collegeId}@alumni.local`,
    passwordHash: params.passwordHash,
    fullName: `Alumni ${pad(serial)} ${params.collegeId.toUpperCase()}`,
    department,
    graduationYear,
    company,
    designation,
    phone: randomPhone('87'),
    bio: `${designation} at ${company}. Graduated ${graduationYear} from ${department}.`,
    headline: `${designation} at ${company}`,
    location,
    skills: 'Leadership,Communication,Problem Solving',
    profileLinks: [],
    availableMentorship: serial % 3 === 0,
    availableReferral: serial % 2 === 0,
    status: 'approved',
    isActive: true,
    isApproved: true,
  };
}

function buildAdminRow(college: CollegeDefinition, passwordHash: string): AdminSeedRow {
  return {
    collegeId: college.id,
    email: `admin@${college.id}.alumni.local`,
    username: `admin_${college.id}`,
    fullName: `Admin ${college.id.toUpperCase()}`,
    passwordHash,
    isActive: true,
  };
}

function buildCollegeRow(college: CollegeDefinition): CollegeSeedRow {
  return {
    id: college.id,
    name: college.name,
    subdomain: college.subdomain,
    location: college.location,
    code: college.code,
    isActive: true,
    metadata: {},
  };
}

function buildEventRows(collegeId: string, currentYear: number): EventSeedRow[] {
  const upperCollegeId = collegeId.toUpperCase();

  return [
    {
      collegeId,
      title: `${upperCollegeId} Annual Alumni Meet ${currentYear}`,
      description: 'Meet and network with 200+ alumni.',
      eventType: 'Networking',
      location: 'Main Auditorium',
      eventDate: new Date(`${currentYear}-12-15T10:00:00Z`),
      maxCapacity: 300,
      status: 'upcoming',
      targetColleges: [],
      isGlobal: false,
    },
    {
      collegeId,
      title: `AI/ML Workshop - ${upperCollegeId}`,
      description: 'Hands-on workshop with TensorFlow and PyTorch.',
      eventType: 'Workshop',
      location: 'Computer Lab',
      eventDate: new Date(`${currentYear}-11-20T09:00:00Z`),
      maxCapacity: 50,
      status: 'upcoming',
      targetColleges: [],
      isGlobal: false,
    },
    {
      collegeId,
      title: `Campus Career Fair ${currentYear}`,
      description: 'Top companies hiring on-campus.',
      eventType: 'Career',
      location: 'Main Hall',
      eventDate: new Date(`${currentYear}-10-05T09:00:00Z`),
      maxCapacity: 500,
      status: 'upcoming',
      targetColleges: [],
      isGlobal: false,
    },
  ];
}

function buildOpportunityRows(collegeId: string): OpportunitySeedRow[] {
  return [
    {
      collegeId,
      title: 'Software Engineer Intern',
      company: 'Google',
      location: 'Bangalore',
      jobType: 'Internship',
      description: 'Build scalable backend systems.',
      skillsRequired: 'Python,Go,Kubernetes',
      salary: 'Rs.60,000/month',
      status: 'active',
      openingsCount: 1,
      isGlobal: false,
      targetColleges: [],
    },
    {
      collegeId,
      title: 'Associate Product Manager',
      company: 'Amazon',
      location: 'Hyderabad',
      jobType: 'Full-time',
      description: 'Own product roadmap end-to-end.',
      skillsRequired: 'SQL,Excel,Figma',
      salary: '18 LPA',
      status: 'active',
      openingsCount: 1,
      isGlobal: false,
      targetColleges: [],
    },
  ];
}

async function seedColleges(colleges: CollegeDefinition[], dryRun: boolean): Promise<void> {
  await Promise.all(
    colleges.map(async (college) => {
      const data = buildCollegeRow(college);

      if (dryRun) {
        logCollege(college.id, `dry-run upsert college ${college.name}`);
        return;
      }

      await prisma.college.upsert({
        where: { id: college.id },
        create: data,
        update: {
          name: data.name,
          subdomain: data.subdomain,
          location: data.location,
          code: data.code,
          isActive: data.isActive,
          metadata: data.metadata,
        },
      });

      logCollege(college.id, `college ready at subdomain "${college.subdomain}"`);
    }),
  );
}

async function seedAdmins(
  colleges: CollegeDefinition[],
  passwords: SeedPasswords,
  dryRun: boolean,
): Promise<void> {
  await Promise.all(
    colleges.map(async (college) => {
      const data = buildAdminRow(college, passwords.admin);

      if (dryRun) {
        logCollege(college.id, `dry-run upsert admin ${data.email}`);
        return;
      }

      await prisma.admin.upsert({
        where: { email: data.email },
        create: data,
        update: {
          collegeId: data.collegeId,
          username: data.username,
          fullName: data.fullName,
          passwordHash: data.passwordHash,
          isActive: data.isActive,
        },
      });

      logCollege(college.id, `admin ready: ${data.email}`);
    }),
  );
}

async function seedStudents(
  colleges: CollegeDefinition[],
  config: SeedConfig,
  passwords: SeedPasswords,
  dryRun: boolean,
): Promise<void> {
  await Promise.all(
    colleges.map(async (college) => {
      const result = await createManyInChunks<StudentSeedRow>({
        total: config.studentsPerCollege,
        chunkSize: config.chunkSize,
        dryRun,
        buildRow: (index) =>
          buildStudentRow({
            collegeId: college.id,
            index,
            passwordHash: passwords.student,
            batchYears: config.batchYears,
          }),
        insert: async (rows) => {
          const response = await prisma.student.createMany({
            data: rows,
            skipDuplicates: true,
          });

          return response.count;
        },
      });

      logCollege(
        college.id,
        `students ${dryRun ? 'planned' : 'inserted'}: ${result.inserted}/${result.total} across ${result.chunks} chunk(s)`,
      );
    }),
  );
}

async function seedAlumni(
  colleges: CollegeDefinition[],
  config: SeedConfig,
  passwords: SeedPasswords,
  dryRun: boolean,
): Promise<void> {
  await Promise.all(
    colleges.map(async (college) => {
      const result = await createManyInChunks<AlumniSeedRow>({
        total: config.alumniPerCollege,
        chunkSize: config.chunkSize,
        dryRun,
        buildRow: (index) =>
          buildAlumniRow({
            collegeId: college.id,
            index,
            passwordHash: passwords.student,
            batchYears: config.batchYears,
          }),
        insert: async (rows) => {
          const response = await prisma.alumni.createMany({
            data: rows,
            skipDuplicates: true,
          });

          return response.count;
        },
      });

      logCollege(
        college.id,
        `alumni ${dryRun ? 'planned' : 'inserted'}: ${result.inserted}/${result.total} across ${result.chunks} chunk(s)`,
      );
    }),
  );
}

async function insertMissingEvents(
  collegeId: string,
  rows: EventSeedRow[],
  dryRun: boolean,
): Promise<number> {
  if (dryRun) return rows.length;

  const existing: Array<{ title: string }> = await prisma.event.findMany({
    where: {
      collegeId,
      title: { in: rows.map((row) => row.title) },
    },
    select: { title: true },
  });

  const existingTitles = new Set(existing.map((row) => row.title));
  const missing = rows.filter((row) => !existingTitles.has(row.title));

  if (missing.length === 0) return 0;

  const response = await prisma.event.createMany({ data: missing });
  return response.count;
}

async function seedEvents(
  colleges: CollegeDefinition[],
  config: SeedConfig,
  dryRun: boolean,
): Promise<void> {
  await Promise.all(
    colleges.map(async (college) => {
      const rows = buildEventRows(college.id, config.currentYear);
      const inserted = await insertMissingEvents(college.id, rows, dryRun);
      logCollege(
        college.id,
        `events ${dryRun ? 'planned' : 'inserted'}: ${inserted}/${rows.length}`,
      );
    }),
  );
}

async function insertMissingOpportunities(
  collegeId: string,
  rows: OpportunitySeedRow[],
  dryRun: boolean,
): Promise<number> {
  if (dryRun) return rows.length;

  const existing: Array<{ title: string; company: string | null }> =
    await prisma.opportunity.findMany({
    where: {
      collegeId,
      OR: rows.map((row) => ({
        title: row.title,
        company: row.company ?? null,
      })),
    },
    select: {
      title: true,
      company: true,
    },
    });

  const existingKeys = new Set(
    existing.map((row) => `${row.title}::${row.company ?? ''}`),
  );
  const missing = rows.filter(
    (row) => !existingKeys.has(`${row.title}::${row.company ?? ''}`),
  );

  if (missing.length === 0) return 0;

  const response = await prisma.opportunity.createMany({ data: missing });
  return response.count;
}

async function seedOpportunities(
  colleges: CollegeDefinition[],
  dryRun: boolean,
): Promise<void> {
  await Promise.all(
    colleges.map(async (college) => {
      const rows = buildOpportunityRows(college.id);
      const inserted = await insertMissingOpportunities(college.id, rows, dryRun);
      logCollege(
        college.id,
        `opportunities ${dryRun ? 'planned' : 'inserted'}: ${inserted}/${rows.length}`,
      );
    }),
  );
}

function printSummary(colleges: CollegeDefinition[], config: SeedConfig, options: CliOptions): void {
  log('configuration');
  log(`colleges: ${colleges.map((college) => college.id).join(', ')}`);
  log(
    `targets: ${(options.only ? Array.from(options.only) : Array.from(SEED_TARGETS)).join(', ')}`,
  );
  log(`students per college: ${config.studentsPerCollege}`);
  log(`alumni per college: ${config.alumniPerCollege}`);
  log(`hash rounds: ${config.hashRounds}`);
  log(`chunk size: ${config.chunkSize}`);
  log(`dry run: ${options.dryRun ? 'yes' : 'no'}`);
}

function printCredentials(colleges: CollegeDefinition[]): void {
  log('sample credentials');
  for (const college of colleges) {
    console.log(`  [${college.subdomain}]`);
    console.log(`    Student: student0001.${college.id}@alumni.local / secret123`);
    console.log(`    Alumni : alumni0001.${college.id}@alumni.local / secret123`);
    console.log(`    Admin  : admin@${college.id}.alumni.local / admin123`);
  }
}

async function main(): Promise<void> {
  const config = createConfig();
  const options = parseCliOptions(process.argv.slice(2));
  const colleges = selectColleges(options);
  const passwords = await withTiming('password preparation', () =>
    preparePasswords(config.hashRounds),
  );

  printSummary(colleges, config, options);

  if (shouldSeed(options, 'colleges')) {
    await withTiming('college seeding', () => seedColleges(colleges, options.dryRun));
  }

  const collegeTasks: Promise<void>[] = [];

  if (shouldSeed(options, 'admins')) {
    collegeTasks.push(seedAdmins(colleges, passwords, options.dryRun));
  }

  if (shouldSeed(options, 'students')) {
    collegeTasks.push(seedStudents(colleges, config, passwords, options.dryRun));
  }

  if (shouldSeed(options, 'alumni')) {
    collegeTasks.push(seedAlumni(colleges, config, passwords, options.dryRun));
  }

  if (shouldSeed(options, 'events')) {
    collegeTasks.push(seedEvents(colleges, config, options.dryRun));
  }

  if (shouldSeed(options, 'opportunities')) {
    collegeTasks.push(seedOpportunities(colleges, options.dryRun));
  }

  if (collegeTasks.length > 0) {
    await withTiming('college workload seeding', async () => {
      await Promise.all(collegeTasks);
    });
  }

  log('seed complete');
  printCredentials(colleges);
}

main()
  .catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022') {
      console.error(
        '[seed] fatal: database schema is behind the Prisma schema. Run "npm run db:migrate" in backend, then retry "npm run db:seed".',
      );
      console.error(error.message);
    } else if (error instanceof Error) {
      console.error('[seed] fatal:', error.message);
      console.error(error.stack);
    } else {
      console.error('[seed] fatal:', error);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
