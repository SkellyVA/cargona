const { MongoClient } = require('mongodb');
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const uri = 'mongodb+srv://russiansugar92:RliHeR2TuTxHgOU0@cluster0.bc9il.mongodb.net/test?retryWrites=true&w=majority';

async function main() {
  console.log('Connecting to MongoDB with custom DNS (8.8.8.8)...');
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB successfully!\n');

    // List all databases
    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    console.log('--- ALL DATABASES ---');
    for (const d of dbs.databases) {
      console.log(`- Database: ${d.name}`);
    }

    // Inspect 'test' database
    const testDb = client.db('test');
    const cols = await testDb.listCollections().toArray();
    console.log(`\n--- COLLECTIONS IN 'test' (${cols.length}) ---`);
    for (const col of cols) {
      const c = testDb.collection(col.name);
      const count = await c.countDocuments();
      const sample = await c.find({}).limit(1).toArray();
      console.log(`\n========================================`);
      console.log(`Collection: ${col.name} (Count: ${count})`);
      if (sample.length > 0) {
        console.log('Fields:', Object.keys(sample[0]));
        console.log('Sample Document:');
        console.log(JSON.stringify(sample[0], null, 2));
      } else {
        console.log('Empty collection');
      }
    }

    // Also check CargoBot4 database if present
    const cb4 = client.db('CargoBot4');
    const cb4Cols = await cb4.listCollections().toArray();
    if (cb4Cols.length > 0) {
      console.log(`\n--- COLLECTIONS IN 'CargoBot4' (${cb4Cols.length}) ---`);
      for (const col of cb4Cols) {
        const c = cb4.collection(col.name);
        const count = await c.countDocuments();
        console.log(`- ${col.name} (${count} docs)`);
      }
    }
  } catch (err) {
    console.error('Mongo Error:', err);
  } finally {
    await client.close();
  }
}

main();
