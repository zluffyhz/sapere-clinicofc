import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 1. Buscar Heitor Firmino
const [heitor] = await conn.execute(
  "SELECT id, name, familyUserId FROM patients WHERE name LIKE '%Heitor%'"
);
console.log('=== Paciente Heitor ===');
console.table(heitor);

// 2. Buscar Vitória Santos
const [vitoria] = await conn.execute(
  "SELECT id, name, role, specialties FROM users WHERE name LIKE '%Vit%ria%' OR name LIKE '%Vitoria%'"
);
console.log('=== Terapeuta Vitória ===');
console.table(vitoria);

if (heitor.length > 0 && vitoria.length > 0) {
  const patientId = heitor[0].id;
  const therapistId = vitoria[0].id;

  // 3. Verificar vinculações do Heitor com a Vitória
  const [assignments] = await conn.execute(
    "SELECT * FROM patient_therapist_assignments WHERE patientId = ? AND therapistUserId = ?",
    [patientId, therapistId]
  );
  console.log('=== Vinculações Heitor <-> Vitória ===');
  console.table(assignments);

  // 4. Verificar agendamentos do Heitor com a Vitória
  const [apts] = await conn.execute(
    "SELECT id, therapyType, status, startTime FROM appointments WHERE patientId = ? AND therapistUserId = ? ORDER BY startTime DESC LIMIT 10",
    [patientId, therapistId]
  );
  console.log('=== Agendamentos Heitor com Vitória (últimos 10) ===');
  console.table(apts);

  // 5. Verificar evoluções do Heitor registradas pela Vitória
  const [evos] = await conn.execute(
    "SELECT id, sessionDate, therapistUserId FROM evolutions WHERE patientId = ? AND therapistUserId = ? ORDER BY sessionDate DESC LIMIT 5",
    [patientId, therapistId]
  );
  console.log('=== Evoluções Heitor por Vitória ===');
  console.table(evos);

  // 6. Verificar se o familyUserId do Heitor existe na tabela users
  if (heitor[0].familyUserId) {
    const [family] = await conn.execute(
      "SELECT id, name, role FROM users WHERE id = ?",
      [heitor[0].familyUserId]
    );
    console.log('=== Família do Heitor ===');
    console.table(family);
  } else {
    console.log('=== ATENÇÃO: Heitor não tem familyUserId vinculado ===');
  }
}

await conn.end();
