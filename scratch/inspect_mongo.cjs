const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://russiansugar92:RliHeR2TuTxHgOU0@cluster0.bc9il.mongodb.net/test?retryWrites=true&w=majority';

async function inspect() {
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected successfully!');
    
    // List databases
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log('\n--- DATABASES ---');
    dbs.databases.forEach(db => console.log(`- ${db.name} (${db.sizeOnDisk} bytes)`));
    
    // Check 'test' database collections
    const db = client.db('test');
    const collections = await db.listCollections().toArray();
    console.log(`\n--- COLLECTIONS IN 'test' (${collections.length} total) ---`);
    
    for (const col of collections) {
      const c = db.collection(col.name);
      const count = await c.countDocuments();
      const sample = await c.find({}).limit(2).toArray();
      console.log(`\n========================================`);
      console.log(`Collection: ${col.name} (Count: ${count})`);
      console.log(`Sample document keys:`, sample.length > 0 ? Object.keys(sample[0]) : 'EMPTY');
      console.log(`Sample doc #1:`, JSON.stringify(sample[0], null, 2));
    }
  } catch (err) {
    console.error('Error inspecting MongoDB:', err);
  } finally {
    await client.close();
  }
}

inspect();
