'use strict';
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, initDatabase } = require('./database');

async function seed() {
  await initDatabase();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const hash = (pw) => bcrypt.hashSync(pw, 10);
    const collegeId = 'skit';

    await client.query(
      `INSERT INTO colleges (id, name)
       VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
      [collegeId, 'SKIT College']
    );

    await client.query(
      `INSERT INTO admins (username, email, password_hash, full_name, college_id)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (username) DO NOTHING`,
      ['admin', 'admin@alumniconnect.com', hash('admin123'), 'Admin', collegeId]
    );

    const students = [
      ['Aman Kumar', 'USN001', 'CSE', '6th Sem', 'aman@student.com', '9876543210'],
      ['Durgaprasad G', 'USN002', 'ISE', '4th Sem', 'durga@student.com', '9876543211'],
      ['Darshan R', 'USN003', 'ECE', '8th Sem', 'darshan@student.com', '9876543212'],
      ['Chitra B', 'USN004', 'CSE', '2nd Sem', 'chitra@student.com', '9876543213'],
      ['Meghana G', 'USN005', 'MECH', '6th Sem', 'meghana@student.com', '9876543214'],
    ];

    const studentIds = [];
    for (const [full_name, usn, dept, year, email, phone] of students) {
      const r = await client.query(
        `INSERT INTO students (full_name,usn,department,year,email,phone,password_hash,bio,skills,is_approved,college_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10)
         ON CONFLICT (email) DO UPDATE SET
           full_name=EXCLUDED.full_name,
           department=EXCLUDED.department,
           year=EXCLUDED.year,
           is_approved=true,
           college_id=EXCLUDED.college_id
         RETURNING id`,
        [full_name, usn, dept, year, email, phone, hash('secret123'), `${full_name} is a passionate ${dept} student.`, 'Python,JavaScript,SQL', collegeId]
      );
      studentIds.push(r.rows[0].id);
    }

    const alumniList = [
      ['Rahul Mehta', 'rahul@google.com', 'Google', 'Senior SWE', 'Bangalore', 2020, 'CSE'],
      ['Priya Nair', 'priya@amazon.com', 'Amazon', 'Product Manager', 'Hyderabad', 2019, 'ISE'],
      ['Ananya Sharma', 'ananya@microsoft.com', 'Microsoft', 'Cloud Architect', 'Pune', 2018, 'CSE'],
      ['Karthik R', 'karthik@deloitte.com', 'Deloitte', 'Data Scientist', 'Chennai', 2021, 'ECE'],
      ['Sneha Reddy', 'sneha@infosys.com', 'Infosys', 'Tech Lead', 'Mysore', 2017, 'ISE'],
    ];

    const alumniIds = [];
    for (const [name, email, company, designation, location, gradYear, dept] of alumniList) {
      const r = await client.query(
        `INSERT INTO alumni (full_name,email,password_hash,company,designation,location,graduation_year,department,bio,is_approved,status,college_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,'approved',$10)
         ON CONFLICT (email) DO UPDATE SET
           full_name=EXCLUDED.full_name,
           company=EXCLUDED.company,
           designation=EXCLUDED.designation,
           is_approved=true,
           status='approved',
           college_id=EXCLUDED.college_id
         RETURNING id`,
        [name, email, hash('secret123'), company, designation, location, gradYear, dept, `${name} works at ${company} as ${designation}.`, collegeId]
      );
      alumniIds.push(r.rows[0].id);
    }

    const opportunities = [
      [alumniIds[0], 'Software Engineer Intern', 'Google', 'Bangalore', 'Internship', 'Build scalable backend systems.', 'Python,Go,Kubernetes', '60000/mo', 'active'],
      [alumniIds[1], 'Associate Product Manager', 'Amazon', 'Hyderabad', 'Full-time', 'Own product roadmap end-to-end.', 'SQL,Excel,Figma', '18 LPA', 'active'],
      [alumniIds[2], 'Cloud Solutions Architect', 'Microsoft', 'Pune', 'Full-time', 'Design enterprise cloud solutions.', 'Azure,DevOps,Python', '30 LPA', 'active'],
      [alumniIds[3], 'Data Analyst Intern', 'Deloitte', 'Chennai', 'Internship', 'Analyse and visualise business KPIs.', 'Tableau,SQL,Python', '35000/mo', 'active'],
      [alumniIds[4], 'Tech Lead Java', 'Infosys', 'Mysore', 'Full-time', 'Lead a Java microservices team.', 'Java,Spring,Kafka', '22 LPA', 'active'],
    ];

    for (const [alumniId, title, company, location, jobType, description, skills, salary, status] of opportunities) {
      await client.query(
        `INSERT INTO opportunities (alumni_id,college_id,title,company,location,job_type,description,skills_required,salary,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [alumniId, collegeId, title, company, location, jobType, description, skills, salary, status]
      );
    }

    const events = [
      ['Annual Alumni Meet 2025', 'Meet and network with 200+ alumni.', '2025-12-15 10:00', 'Auditorium, Block A', 'Networking', 300],
      ['AI ML Workshop', 'Hands-on ML with TensorFlow.', '2025-11-20 09:00', 'Computer Lab 3', 'Workshop', 50],
      ['Career Fair Spring 2025', 'Top companies hiring on-campus.', '2025-10-05 09:00', 'Main Hall', 'Career', 500],
      ['Hackathon 2025', '24-hour coding challenge.', '2025-09-28 08:00', 'Innovation Centre', 'Tech', 100],
    ];

    const eventIds = [];
    for (const [title, desc, date, location, eventType, capacity] of events) {
      const r = await client.query(
        `INSERT INTO events (college_id,title,description,event_date,location,event_type,max_capacity)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [collegeId, title, desc, date, location, eventType, capacity]
      );
      eventIds.push(r.rows[0].id);
    }

    await client.query(
      `INSERT INTO mentorship_requests (student_id,alumni_id,college_id,message,status)
       VALUES ($1,$2,$3,$4,'accepted'),($5,$6,$7,$8,'pending'),($9,$10,$11,$12,'pending')
       ON CONFLICT DO NOTHING`,
      [
        studentIds[0], alumniIds[0], collegeId, 'I want to learn about SWE careers at Google.',
        studentIds[1], alumniIds[1], collegeId, 'Please guide me on PM career path.',
        studentIds[2], alumniIds[2], collegeId, 'Need help with cloud certifications.',
      ]
    );

    await client.query(
      `INSERT INTO referral_requests (student_id,alumni_id,college_id,company,job_title,message,status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending'),($7,$8,$9,$10,$11,$12,'accepted')
       ON CONFLICT DO NOTHING`,
      [
        studentIds[0], alumniIds[0], collegeId, 'Google', 'SWE Intern', 'Please refer me for the internship.',
        studentIds[1], alumniIds[1], collegeId, 'Amazon', 'APM', 'I have relevant experience.',
      ]
    );

    const conv = await client.query(`INSERT INTO conversations (college_id) VALUES ($1) RETURNING id`, [collegeId]);
    const cid = conv.rows[0].id;
    await client.query(
      `INSERT INTO conversation_participants (conversation_id, participant_id, participant_type)
       VALUES ($1,$2,'student'),($1,$3,'alumni')`,
      [cid, studentIds[0], alumniIds[0]]
    );
    await client.query(
      `INSERT INTO messages (conversation_id,sender_id,sender_type,message,is_read,college_id)
       VALUES ($1,$2,'student',$3,true,$6),($1,$4,'alumni',$5,false,$6)`,
      [cid, studentIds[0], 'Hi Rahul! Excited to connect.', alumniIds[0], 'Hello Aman! Happy to help you.', collegeId]
    );

    await client.query(
      `INSERT INTO notifications (user_id,user_type,title,message,type,college_id)
       VALUES ($1,'student','Mentorship Accepted','Rahul Mehta accepted your mentorship request!','mentorship',$4),
              ($2,'student','New Event','Annual Alumni Meet 2025 is coming up!','event',$4),
              ($3,'alumni','New Mentorship Request','Durgaprasad G sent you a mentorship request.','mentorship',$4)
       ON CONFLICT DO NOTHING`,
      [studentIds[0], studentIds[1], alumniIds[1], collegeId]
    );

    await client.query(
      `INSERT INTO event_registrations (event_id, student_id, college_id)
       VALUES ($1,$2,$3),($4,$5,$6)
       ON CONFLICT DO NOTHING`,
      [eventIds[0], studentIds[0], collegeId, eventIds[1], studentIds[1], collegeId]
    );

    await client.query('COMMIT');
    console.log('Seed data inserted successfully');
    console.log('\nLogin Credentials:');
    console.log('  Student: aman@student.com / secret123');
    console.log('  Alumni:  rahul@google.com / secret123');
    console.log('  Admin:   admin / admin123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => { console.error(err); process.exit(1); });
