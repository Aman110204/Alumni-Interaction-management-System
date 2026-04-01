'use strict';
/**
 * bulkSeed.js
 *
 * Generates realistic alumni data for a college:
 *   - 300 alumni per batch year
 *   - Batches: 2018 → 2024  (7 batches = 2100 alumni total)
 *   - Departments: CSE, ISE, ECE, MECH, CIVIL, EEE, MBA, MCA
 *   - Realistic Indian names, companies, designations, skills
 *
 * Usage:
 *   node backend/config/bulkSeed.js
 *   node backend/config/bulkSeed.js --college skit --batches 2019,2020,2021,2022
 *   node backend/config/bulkSeed.js --college skit --per-batch 100
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, initDatabase } = require('./database');

// ── CLI args ──────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const getArg  = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : def; };
const COLLEGE = getArg('--college', 'skit');
const PER_BATCH = parseInt(getArg('--per-batch', '300'), 10);
const BATCH_YEARS = (getArg('--batches', '2018,2019,2020,2021,2022,2023,2024'))
  .split(',').map(y => parseInt(y.trim(), 10));

// ── Data pools ────────────────────────────────────────────────────────────────
const FIRST_NAMES = [
  'Aarav','Aditya','Akash','Anil','Anish','Ankit','Anshul','Arjun','Aryan','Ashwin',
  'Bharat','Chirag','Deepak','Dhruv','Dinesh','Ganesh','Gaurav','Harsh','Hemant','Ishan',
  'Jai','Jatin','Karan','Kartik','Kishan','Krishna','Kunal','Lakshman','Manish','Mayank',
  'Mihir','Mohit','Nakul','Nikhil','Nitin','Om','Pavan','Pranav','Prashant','Pratik',
  'Pulkit','Rahul','Raj','Rajat','Rajesh','Rakesh','Ram','Ravi','Ritesh','Rohit',
  'Sachin','Sahil','Saurabh','Shivam','Shreyas','Sidharth','Srinivas','Sunil','Suresh','Tarun',
  'Tushar','Uday','Varun','Vijay','Vikram','Vinay','Vishal','Vivek','Yogesh','Yuvraj',
  // Female names
  'Aakanksha','Aditi','Aishwarya','Akshata','Amrita','Ananya','Ankita','Anushka','Aparna','Archana',
  'Bhavana','Chandana','Deepika','Divya','Drishti','Gauri','Harini','Ishita','Janhvi','Kavitha',
  'Keerthi','Kritika','Lakshmi','Lavanya','Madhuri','Manasa','Meghana','Meera','Namrata','Nandita',
  'Neha','Nisha','Pallavi','Pavithra','Pooja','Preethi','Priya','Ranjitha','Rekha','Riddhi',
  'Riya','Rohini','Rukmini','Sandhya','Shilpa','Shreya','Shruti','Simran','Sneha','Sonal',
  'Sowmya','Sreedevi','Sruthi','Suchitra','Sunita','Swathi','Tanvi','Tanya','Usha','Varsha',
  'Vidya','Vimala','Vrinda','Yamini','Yashaswini','Yogita','Zara','Divyashree','Nidhi','Prarthana',
];

const LAST_NAMES = [
  'Agarwal','Ahuja','Anand','Arora','Bajaj','Bakshi','Banerjee','Bhat','Bhatt','Bhatia',
  'Chakraborty','Chand','Chandra','Chatterjee','Chauhan','Chawla','Chopra','Das','Dave','Desai',
  'Deshpande','Dey','Dubey','Dutta','Garg','Ghosh','Goyal','Gupta','Iyer','Jain',
  'Jha','Joshi','Kamath','Kapoor','Kaur','Khan','Khanna','Khatri','Kohli','Krishna',
  'Kumar','Lal','Malhotra','Mathur','Mehta','Menon','Mishra','Mistry','Modi','Mohan',
  'Nair','Naik','Narayanan','Negi','Pande','Pandey','Patel','Patil','Pillai','Prasad',
  'Rao','Rastogi','Reddy','Saxena','Shah','Sharma','Shukla','Singh','Sinha','Srivastava',
  'Subramaniam','Tiwari','Tripathi','Varma','Verma','Yadav','Gowda','Hegde','Murthy','Naidu',
  'Rajan','Rangarajan','Seshadri','Subramanian','Swamy','Venkatesh','Vishwanath','Amin','Bhide','Deshpande',
];

const DEPARTMENTS = [
  { name: 'Computer Science (CSE)',       weight: 30 },
  { name: 'Information Science (ISE)',    weight: 20 },
  { name: 'Electronics & Comm (ECE)',     weight: 20 },
  { name: 'Mechanical Engineering (MECH)',weight: 12 },
  { name: 'Civil Engineering (CIVIL)',    weight: 8  },
  { name: 'Electrical Engineering (EEE)', weight: 5  },
  { name: 'Master of Business Admin (MBA)', weight: 3 },
  { name: 'Master of Computer Apps (MCA)', weight: 2 },
];

const COMPANIES = [
  'Google','Amazon','Microsoft','Infosys','TCS','Wipro','HCL Technologies','Accenture',
  'Cognizant','Tech Mahindra','IBM','Oracle','Capgemini','Deloitte','Flipkart','Swiggy',
  'Zomato','PhonePe','Razorpay','CRED','Meesho','Ola','Uber','Byju\'s','Unacademy',
  'Paytm','Freshworks','Zoho','MindTree','Mphasis','L&T Infotech','Hexaware','NIIT Tech',
  'Persistent Systems','Cyient','Sasken','CSS Corp','Happiest Minds','Zensar Technologies',
  'Tata Elxsi','Syntel','iGate','Mastech','Geometric','Kpit Technologies','Roper Technologies',
  'SAP','Adobe','Salesforce','ServiceNow','Workday','VMware','Palo Alto','CrowdStrike',
  'Qualcomm','Intel','ARM Holdings','NVIDIA','Texas Instruments','Bosch','Siemens',
  'Mahindra','Tata Motors','Hero MotoCorp','TVS','Bajaj Auto','BHEL','NTPC','ONGC',
  'JP Morgan','Goldman Sachs','Morgan Stanley','HDFC Bank','ICICI Bank','Axis Bank',
  'Ernst & Young','KPMG','McKinsey','Bain & Company','BCG','PwC',
];

const DESIGNATIONS_BY_DEPT = {
  'Computer Science (CSE)': [
    'Software Engineer','Senior Software Engineer','Staff Engineer','Tech Lead',
    'Backend Engineer','Frontend Engineer','Full Stack Developer','DevOps Engineer',
    'Cloud Architect','Solutions Architect','Data Engineer','ML Engineer',
    'SDE-I','SDE-II','SDE-III','Engineering Manager','Principal Engineer',
  ],
  'Information Science (ISE)': [
    'Software Engineer','Systems Analyst','IT Consultant','Database Administrator',
    'Business Analyst','Product Analyst','Data Analyst','Network Engineer',
    'Information Security Analyst','IT Manager','Technical Program Manager',
  ],
  'Electronics & Comm (ECE)': [
    'Embedded Systems Engineer','VLSI Design Engineer','RF Engineer',
    'Hardware Engineer','Telecom Engineer','Signal Processing Engineer',
    'IoT Developer','Firmware Engineer','Test Engineer','PCB Designer',
    'Network Engineer','5G Solutions Architect',
  ],
  'Mechanical Engineering (MECH)': [
    'Mechanical Engineer','Design Engineer','Manufacturing Engineer',
    'Project Engineer','Automotive Engineer','R&D Engineer',
    'Production Manager','Quality Engineer','CAD Engineer','Piping Engineer',
  ],
  'Civil Engineering (CIVIL)': [
    'Civil Engineer','Structural Engineer','Site Engineer',
    'Project Manager','Construction Manager','Urban Planner',
    'Geotechnical Engineer','Environmental Engineer','Bridge Engineer',
  ],
  'Electrical Engineering (EEE)': [
    'Electrical Engineer','Power Systems Engineer','Control Systems Engineer',
    'Instrumentation Engineer','Automation Engineer','PLC Programmer',
    'Electrical Design Engineer','Energy Consultant',
  ],
  'Master of Business Admin (MBA)': [
    'Business Analyst','Product Manager','Strategy Consultant','Marketing Manager',
    'Operations Manager','Finance Analyst','HR Business Partner',
    'Sales Manager','Brand Manager','Management Consultant',
  ],
  'Master of Computer Apps (MCA)': [
    'Software Developer','Web Developer','Application Developer',
    'Java Developer','Python Developer','Mobile App Developer',
    'Database Developer','Systems Programmer',
  ],
};

const SKILLS_BY_DEPT = {
  'Computer Science (CSE)':        ['Python','JavaScript','Java','Go','Rust','C++','React','Node.js','AWS','Kubernetes','Docker','PostgreSQL','Redis','GraphQL','TypeScript','Spring Boot','Microservices','System Design','LLMs','PyTorch'],
  'Information Science (ISE)':     ['Python','SQL','Power BI','Tableau','Excel','Salesforce','ServiceNow','JIRA','Confluence','Network Security','CCNA','AWS','Azure','Bash','Linux','ETL','Informatica'],
  'Electronics & Comm (ECE)':      ['VHDL','Verilog','C','C++','MATLAB','LabVIEW','Embedded C','ARM','RTOS','PCB Design','Altium','FPGA','RF Design','Signal Processing','Python','Cadence'],
  'Mechanical Engineering (MECH)': ['AutoCAD','SolidWorks','CATIA','ANSYS','Pro-E','MATLAB','6-Sigma','Lean Manufacturing','FEA','CFD','GD&T','Creo'],
  'Civil Engineering (CIVIL)':     ['AutoCAD','Revit','STAAD Pro','ETABS','PRIMAVERA','MS Project','SAP2000','Civil 3D','GIS','Surveying'],
  'Electrical Engineering (EEE)':  ['MATLAB','Simulink','AutoCAD Electrical','PLC','SCADA','Python','LabVIEW','ETAP','Power Systems','PSpice'],
  'Master of Business Admin (MBA)':['Excel','PowerPoint','Python','SQL','Tableau','SPSS','Salesforce','HubSpot','Google Analytics','Financial Modelling','Strategic Planning'],
  'Master of Computer Apps (MCA)': ['Java','Python','PHP','MySQL','MongoDB','React','Angular','Spring','Django','REST APIs','Git','Linux'],
};

const LOCATIONS = [
  'Bangalore','Hyderabad','Pune','Chennai','Mumbai','Delhi','Noida','Gurgaon',
  'Kolkata','Ahmedabad','Kochi','Jaipur','Chandigarh','Indore','Coimbatore',
  'Mysore','Hubli','Mangalore','Manipal','Belgaum','Udupi','Dharwad',
  'San Francisco, USA','Seattle, USA','New York, USA','Austin, USA',
  'London, UK','Singapore','Dubai, UAE','Toronto, Canada','Berlin, Germany',
];

const HEADLINES = [
  'Building the future of tech | {company}',
  'Passionate engineer at {company} | {dept} grad',
  'Turning ideas into products @ {company}',
  'Code. Ship. Repeat. | {company}',
  'Open to mentoring | {designation} @ {company}',
  '{designation} at {company} | SKIT Alumni',
  'Full-stack thinker | Currently @ {company}',
  'Building scalable systems | {company}',
  'From SKIT to {company} 🚀',
  'Tech enthusiast | {designation} | {company}',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const rand    = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const chance  = (pct) => Math.random() * 100 < pct;

function weightedPick(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.name;
  }
  return items[items.length - 1].name;
}

function pickSkills(dept, count = randInt(3, 7)) {
  const pool = SKILLS_BY_DEPT[dept] || SKILLS_BY_DEPT['Computer Science (CSE)'];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).join(',');
}

function makeName(usedEmails) {
  let first, last, email;
  let attempts = 0;
  do {
    first = rand(FIRST_NAMES);
    last  = rand(LAST_NAMES);
    const tag = randInt(10, 9999);
    email = `${first.toLowerCase()}.${last.toLowerCase()}${tag}@alumni.skit.edu`;
    attempts++;
  } while (usedEmails.has(email) && attempts < 20);
  return { first, last, email, fullName: `${first} ${last}` };
}

function makeHeadline(designation, company, dept) {
  const tpl = rand(HEADLINES);
  return tpl
    .replace('{company}', company)
    .replace('{designation}', designation)
    .replace('{dept}', dept.split('(')[1]?.replace(')', '') || dept.split(' ')[0]);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function bulkSeed() {
  await initDatabase();
  const client = await pool.connect();

  // Pre-hash a single password for all users (much faster than hashing 2100 times)
  console.log('Pre-hashing password…');
  const passwordHash = bcrypt.hashSync('secret123', 10);

  try {
    // Verify college exists
    const colRes = await client.query('SELECT id, name FROM colleges WHERE id = $1', [COLLEGE]);
    if (!colRes.rowCount) {
      console.error(`❌  College '${COLLEGE}' not found. Run the main seed first.`);
      process.exit(1);
    }
    console.log(`✅  College: ${colRes.rows[0].name} (${COLLEGE})`);

    const usedEmails = new Set();
    // Load existing emails so we don't collide
    const existingEmails = await client.query('SELECT email FROM alumni WHERE college_id = $1', [COLLEGE]);
    existingEmails.rows.forEach(r => usedEmails.add(r.email));

    let totalInserted = 0;

    for (const batchYear of BATCH_YEARS) {
      console.log(`\n📦  Seeding Batch ${batchYear} (${PER_BATCH} alumni)…`);
      await client.query('BEGIN');

      let batchInserted = 0;

      for (let i = 0; i < PER_BATCH; i++) {
        const dept        = weightedPick(DEPARTMENTS);
        const { fullName, email } = makeName(usedEmails);
        usedEmails.add(email);

        const designations = DESIGNATIONS_BY_DEPT[dept] || ['Engineer'];
        // More senior designations for older batches
        const yearsExp     = new Date().getFullYear() - batchYear;
        const seniorWeight = Math.min(yearsExp / 6, 1); // 0–1
        const designIdx    = Math.floor(Math.random() * designations.length * (0.4 + seniorWeight * 0.6));
        const designation  = designations[Math.min(designIdx, designations.length - 1)];

        const company      = rand(COMPANIES);
        const location     = rand(LOCATIONS);
        const skills       = pickSkills(dept);
        const headline     = makeHeadline(designation, company, dept);
        const bio          = `${fullName} is a ${dept} graduate from SKIT (Batch ${batchYear}), currently working as ${designation} at ${company}. Based in ${location}.`;
        const mentorship   = chance(15);  // 15% open to mentor
        const referral     = chance(40);  // 40% open to refer
        const linkedin     = chance(60) ? `https://linkedin.com/in/${fullName.toLowerCase().replace(/ /g, '-')}-${randInt(100, 999)}` : null;

        await client.query(
          `INSERT INTO alumni
             (full_name, email, password_hash, company, designation, location,
              graduation_year, department, bio, headline, linkedin_url, skills,
              available_mentorship, available_referral, is_approved, is_active,
              status, college_id, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,true,true,'approved',$15,
                   NOW() - ($16 || ' days')::interval)
           ON CONFLICT (email) DO NOTHING`,
          [
            fullName, email, passwordHash, company, designation, location,
            batchYear, dept, bio, headline, linkedin, skills,
            mentorship, referral, COLLEGE,
            randInt(0, 365).toString(),  // random created_at within past year
          ]
        );
        batchInserted++;

        // Progress every 50
        if (batchInserted % 50 === 0) {
          process.stdout.write(`    → ${batchInserted}/${PER_BATCH}\r`);
        }
      }

      await client.query('COMMIT');
      totalInserted += batchInserted;
      console.log(`    ✅  Batch ${batchYear}: ${batchInserted} alumni inserted`);
    }

    // Summary
    const countRes = await client.query(
      `SELECT graduation_year, COUNT(*) AS total
       FROM alumni WHERE college_id = $1 AND is_approved = true
       GROUP BY graduation_year ORDER BY graduation_year DESC`,
      [COLLEGE]
    );

    console.log('\n─────────────────────────────────────');
    console.log('📊  Alumni count by batch (all-time):');
    console.log('─────────────────────────────────────');
    for (const row of countRes.rows) {
      const bar = '█'.repeat(Math.min(Math.floor(row.total / 10), 30));
      console.log(`  Batch ${row.graduation_year}: ${String(row.total).padStart(4)} ${bar}`);
    }
    console.log('─────────────────────────────────────');
    console.log(`\n✅  Done! Inserted ${totalInserted} new alumni across ${BATCH_YEARS.length} batches.`);
    console.log('   All accounts use password: secret123\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌  Error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

bulkSeed().catch((err) => { console.error(err); process.exit(1); });
