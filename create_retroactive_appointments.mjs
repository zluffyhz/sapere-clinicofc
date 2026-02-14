import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const [result1] = await connection.execute(
    'INSERT INTO appointments (patientId, therapistUserId, therapyType, startTime, endTime, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
    [1, 4, 'psicologia', '2026-02-07 10:00:00', '2026-02-07 10:50:00', 'completed']
  );
  console.log('✅ Agendamento 1 criado (Adam - ID:', result1.insertId, ')');
  
  const [result2] = await connection.execute(
    'INSERT INTO appointments (patientId, therapistUserId, therapyType, startTime, endTime, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
    [2, 4, 'psicologia', '2026-02-07 09:00:00', '2026-02-07 09:50:00', 'completed']
  );
  console.log('✅ Agendamento 2 criado (Adriel - ID:', result2.insertId, ')');
  
  // Verify
  const [rows] = await connection.execute(
    'SELECT a.id, p.name as paciente, a.startTime, a.endTime, a.status FROM appointments a JOIN patients p ON a.patientId = p.id WHERE a.patientId IN (1, 2) AND a.therapistUserId = 4 ORDER BY a.startTime'
  );
  console.log('\n📋 Agendamentos verificados:', rows.length, 'encontrados');
  rows.forEach(row => {
    console.log(`  - ID ${row.id}: ${row.paciente} - ${row.startTime} (${row.status})`);
  });
} catch (error) {
  console.error('❌ Erro:', error.message);
  console.error(error);
} finally {
  await connection.end();
}
