import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.js';

// Conectar ao banco de dados
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

console.log('🌱 Iniciando seed de dados de demonstração...\n');

// Dados de demonstração - 20 pacientes
const demoPatients = [
  { name: 'Maria Julia Gama Alves Torres', dateOfBirth: new Date('2021-11-24'), diagnosis: 'TEA - Transtorno do Espectro Autista' },
  { name: 'Murilo Laranjeira Valente', dateOfBirth: new Date('2021-05-27'), diagnosis: 'Atraso no desenvolvimento da fala' },
  { name: 'Antonella Salles Romanini', dateOfBirth: new Date('2022-02-28'), diagnosis: 'TEA - Transtorno do Espectro Autista' },
  { name: 'Pedro Henrique Costa Silva', dateOfBirth: new Date('2020-08-15'), diagnosis: 'TDAH - Transtorno de Déficit de Atenção' },
  { name: 'Ana Clara Ferreira Santos', dateOfBirth: new Date('2021-03-10'), diagnosis: 'Dislexia' },
  { name: 'Lucas Gabriel Oliveira Lima', dateOfBirth: new Date('2019-12-05'), diagnosis: 'TEA - Transtorno do Espectro Autista' },
  { name: 'Sophia Rodrigues Almeida', dateOfBirth: new Date('2022-06-20'), diagnosis: 'Atraso no desenvolvimento motor' },
  { name: 'Miguel Henrique Souza Pereira', dateOfBirth: new Date('2020-09-18'), diagnosis: 'Dificuldade de aprendizagem' },
  { name: 'Isabella Martins Carvalho', dateOfBirth: new Date('2021-07-12'), diagnosis: 'TEA - Transtorno do Espectro Autista' },
  { name: 'Enzo Gabriel Ribeiro Costa', dateOfBirth: new Date('2019-11-30'), diagnosis: 'TDAH - Transtorno de Déficit de Atenção' },
  { name: 'Laura Beatriz Fernandes Dias', dateOfBirth: new Date('2022-01-25'), diagnosis: 'Atraso na fala' },
  { name: 'Arthur Miguel Santos Rocha', dateOfBirth: new Date('2020-04-08'), diagnosis: 'Dislexia' },
  { name: 'Valentina Souza Barbosa', dateOfBirth: new Date('2021-10-14'), diagnosis: 'TEA - Transtorno do Espectro Autista' },
  { name: 'Heitor Alves Monteiro', dateOfBirth: new Date('2019-07-22'), diagnosis: 'Dificuldade de concentração' },
  { name: 'Alice Vitória Lima Cardoso', dateOfBirth: new Date('2022-03-17'), diagnosis: 'Atraso no desenvolvimento' },
  { name: 'Bernardo Henrique Gomes Teixeira', dateOfBirth: new Date('2020-12-09'), diagnosis: 'TDAH - Transtorno de Déficit de Atenção' },
  { name: 'Helena Costa Araújo', dateOfBirth: new Date('2021-08-05'), diagnosis: 'TEA - Transtorno do Espectro Autista' },
  { name: 'Davi Luiz Pereira Mendes', dateOfBirth: new Date('2019-05-28'), diagnosis: 'Dislexia' },
  { name: 'Manuela Rodrigues Nascimento', dateOfBirth: new Date('2022-09-11'), diagnosis: 'Atraso na fala' },
  { name: 'Gabriel Ferreira Moreira', dateOfBirth: new Date('2020-02-19'), diagnosis: 'Dificuldade de aprendizagem' }
];

try {
  // Buscar usuários existentes (terapeutas e famílias)
  const therapists = await db.select().from(schema.users).where(schema.users.role.eq('therapist'));
  const families = await db.select().from(schema.users).where(schema.users.role.eq('family'));

  if (therapists.length === 0) {
    console.log('⚠️  Nenhum terapeuta encontrado. Por favor, cadastre terapeutas primeiro.');
    process.exit(1);
  }

  if (families.length === 0) {
    console.log('⚠️  Nenhuma família encontrada. Por favor, cadastre famílias primeiro.');
    process.exit(1);
  }

  console.log(`✅ Encontrados ${therapists.length} terapeutas e ${families.length} famílias\n`);

  // Inserir pacientes
  console.log('📝 Inserindo pacientes de demonstração...');
  
  for (let i = 0; i < demoPatients.length; i++) {
    const patient = demoPatients[i];
    const therapist = therapists[i % therapists.length]; // Distribuir entre terapeutas
    const family = families[i % families.length]; // Distribuir entre famílias

    const [insertedPatient] = await db.insert(schema.patients).values({
      name: patient.name,
      dateOfBirth: patient.dateOfBirth,
      diagnosis: patient.diagnosis,
      therapistUserId: therapist.id,
      familyUserId: family.id,
      imageAuthorization: Math.random() > 0.5, // 50% chance
      notes: `Paciente de demonstração - ${patient.diagnosis}`
    });

    console.log(`  ✓ ${patient.name} (ID: ${insertedPatient.insertId})`);

    // Criar vinculação terapeuta-paciente
    const therapyTypes = ['fonoaudiologia', 'psicologia', 'terapia_ocupacional'];
    const randomTherapyType = therapyTypes[Math.floor(Math.random() * therapyTypes.length)];

    await db.insert(schema.patientTherapistAssignments).values({
      patientId: insertedPatient.insertId,
      therapistUserId: therapist.id,
      therapyType: randomTherapyType,
      isActive: true
    });
  }

  console.log(`\n✅ ${demoPatients.length} pacientes de demonstração inseridos com sucesso!`);
  console.log('✅ Vinculações terapeuta-paciente criadas!');
  console.log('\n🎉 Seed de dados de demonstração concluído!\n');

} catch (error) {
  console.error('❌ Erro ao inserir dados:', error);
  process.exit(1);
} finally {
  await connection.end();
}
