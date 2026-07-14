import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Heitor Firmino = id 990008
const patientId = 990008;
const vitoriaId = 2725474; // Vitória Santos Lira (fisioterapeuta)

// 1. Verificar o familyUserId do Heitor Firmino
const [family] = await conn.execute(
  "SELECT id, name, role FROM users WHERE id = 6482784"
);
console.log('=== Família do Heitor Firmino (userId 6482784) ===');
console.table(family);

// 2. Verificar todos os agendamentos do Heitor Firmino (qualquer terapeuta)
const [allApts] = await conn.execute(
  "SELECT id, therapistUserId, therapyType, status, startTime FROM appointments WHERE patientId = ? ORDER BY startTime DESC LIMIT 10",
  [patientId]
);
console.log('=== Agendamentos do Heitor Firmino (últimos 10) ===');
console.table(allApts);

// 3. Verificar todas as vinculações do Heitor Firmino
const [assignments] = await conn.execute(
  "SELECT * FROM patient_therapist_assignments WHERE patientId = ?",
  [patientId]
);
console.log('=== Vinculações do Heitor Firmino ===');
console.table(assignments);

// 4. Verificar evoluções do Heitor Firmino
const [evos] = await conn.execute(
  "SELECT id, sessionDate, therapistUserId FROM evolutions WHERE patientId = ? ORDER BY sessionDate DESC LIMIT 5",
  [patientId]
);
console.log('=== Evoluções do Heitor Firmino ===');
console.table(evos);

// 5. Verificar como o TherapistDashboard busca pacientes para a Vitória
// A query de pacientes do terapeuta usa patient_therapist_assignments
const [vitoriaPatients] = await conn.execute(
  "SELECT pta.patientId, p.name FROM patient_therapist_assignments pta LEFT JOIN patients p ON pta.patientId = p.id WHERE pta.therapistUserId = ?",
  [vitoriaId]
);
console.log('=== Pacientes vinculados à Vitória Santos ===');
console.table(vitoriaPatients);

// 6. Verificar se Heitor aparece em agendamentos da Vitória (mesmo sem vinculação)
const [vitoriaApts] = await conn.execute(
  "SELECT a.id, a.patientId, p.name as patientName, a.therapyType, a.status, a.startTime FROM appointments a LEFT JOIN patients p ON a.patientId = p.id WHERE a.therapistUserId = ? ORDER BY a.startTime DESC LIMIT 10",
  [vitoriaId]
);
console.log('=== Agendamentos da Vitória Santos (últimos 10) ===');
console.table(vitoriaApts);

await conn.end();
