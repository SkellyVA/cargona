const { MongoClient } = require('mongodb');
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const uri = 'mongodb+srv://russiansugar92:RliHeR2TuTxHgOU0@cluster0.bc9il.mongodb.net/test?retryWrites=true&w=majority';

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');
  
  const tracksWithUserId = await db.collection('cargo_tracks').countDocuments({ userId: { $exists: true, $ne: null } });
  const tracksWithSubscribers = await db.collection('cargo_tracks').countDocuments({ subscribers: { $exists: true, $ne: [] } });
  console.log('Tracks with userId:', tracksWithUserId);
  console.log('Tracks with subscribers:', tracksWithSubscribers);

  const sampleTracks = await db.collection('cargo_tracks').find({}).limit(5).toArray();
  for (const t of sampleTracks) {
    console.log('Track:', t.code, 'userId:', t.userId, 'subscribers:', t.subscribers);
  }

  const sampleUsers = await db.collection('cargo_users').find({}).limit(5).toArray();
  for (const u of sampleUsers) {
    console.log('User:', u.userId, 'chatId:', u.chatId, 'fullName:', u.fullName, 'phone:', u.phone);
  }

  await client.close();
}

main();
