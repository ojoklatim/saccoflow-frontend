const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:ojokbarnabaslatim@db.cuibyyzhstjmhvebscpc.supabase.co:5432/postgres'
});

async function run() {
  try {
    await client.connect();
    const res = await client.query('SELECT * FROM debug_logs ORDER BY log_time DESC LIMIT 1;');
    console.log(res.rows);
  } catch (err) {
    console.error('Connection error', err.stack);
  } finally {
    await client.end();
  }
}

run();
