import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function main() {
  // Parse DATABASE_URL
  const url = new URL(DATABASE_URL);
  
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port) || 4000,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: {
      rejectUnauthorized: true
    }
  });

  try {
    // Get family user
    const [familyUsers] = await connection.execute(
      "SELECT id, name FROM users WHERE email = 'paciente0familia@sapere.com'"
    );
    
    if (familyUsers.length === 0) {
      console.log('Family user not found, creating...');
      // Create family user if not exists
      await connection.execute(
        `INSERT INTO users (name, email, role, created_at, updated_at) 
         VALUES ('Família Teste', 'paciente0familia@sapere.com', 'family', NOW(), NOW())`
      );
      const [newUser] = await connection.execute(
        "SELECT id FROM users WHERE email = 'paciente0familia@sapere.com'"
      );
      familyUsers.push(newUser[0]);
    }
    
    const familyUserId = familyUsers[0].id;
    console.log('Family User ID:', familyUserId);

    // Get or create patient for this family
    let [patients] = await connection.execute(
      'SELECT id, name FROM patients WHERE familyUserId = ?',
      [familyUserId]
    );
    
    if (patients.length === 0) {
      console.log('No patient found, creating...');
      await connection.execute(
        `INSERT INTO patients (name, birth_date, diagnosis, family_user_id, created_at, updated_at)
         VALUES ('Paciente Teste', '2018-05-15', 'TEA', ?, NOW(), NOW())`,
        [familyUserId]
      );
      [patients] = await connection.execute(
        'SELECT id, name FROM patients WHERE familyUserId = ?',
        [familyUserId]
      );
    }
    
    const patientId = patients[0].id;
    console.log('Patient ID:', patientId);

    // Get a therapist user
    const [therapists] = await connection.execute(
      "SELECT id FROM users WHERE role IN ('therapist', 'admin') LIMIT 1"
    );
    const therapistId = therapists.length > 0 ? therapists[0].id : 1;
    console.log('Therapist ID:', therapistId);

    // Clear existing attendance for this family
    await connection.execute(
      'DELETE FROM attendance WHERE familyUserId = ?',
      [familyUserId]
    );
    console.log('Cleared existing attendance records');

    // Create 120 consecutive attendance records (to unlock all badges)
    // This will give: 100+ streak, 100+ total sessions, 12+ perfect months
    const therapyTypes = ['fonoaudiologia', 'psicologia', 'terapia_ocupacional', 'psicopedagogia'];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 14); // Start 14 months ago
    
    let appointmentId = 1000; // Fake appointment IDs
    
    for (let i = 0; i < 120; i++) {
      const sessionDate = new Date(startDate);
      sessionDate.setDate(sessionDate.getDate() + (i * 3)); // Every 3 days
      
      const therapyType = therapyTypes[i % therapyTypes.length];
      
      await connection.execute(
        `INSERT INTO attendance 
         (appointmentId, patientId, familyUserId, therapistUserId, therapyType, scheduledDate, status, markedByUserId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, 'present', ?, NOW(), NOW())`,
        [appointmentId++, patientId, familyUserId, therapistId, therapyType, sessionDate, therapistId]
      );
      
      if ((i + 1) % 20 === 0) {
        console.log(`Created ${i + 1} attendance records...`);
      }
    }

    console.log('Successfully created 120 attendance records!');
    console.log('This should unlock all badges:');
    console.log('- Streak badges: 5, 10, 25, 50, 100 ✓');
    console.log('- Total sessions badges: 1, 10, 25, 50, 100 ✓');
    console.log('- Perfect month badges: 1, 3, 6, 12 ✓');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

main();
