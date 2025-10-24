require('dotenv').config();
const mongoose = require('mongoose');
const Page = require('../models/Page.model');

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set in environment');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const clientId = process.argv[2];
    const filter = { slug: 'home' };
    if (clientId) filter.clientId = clientId;

    const pages = await Page.find(filter).lean();
    console.log(`Found ${pages.length} candidate page(s) with slug 'home'`);

    let updated = 0, skipped = 0;
    for (const p of pages) {
      let path = '';
      try { path = new URL(p.url).pathname || '/'; } catch (e) { path = '/'; }
      path = path.replace(/\/+$/, '') || '/';
      const isRoot = path === '/';
      if (!isRoot) { skipped++; continue; }

      // Check for existing __root__ for same client
      const existingRoot = await Page.findOne({ clientId: p.clientId, slug: '__root__' });
      if (existingRoot && existingRoot._id.toString() !== p._id.toString()) {
        console.warn(`Client ${p.clientId}: __root__ already exists (keeping existing). Skipping update for ${p._id}`);
        skipped++;
        continue;
      }

      await Page.updateOne({ _id: p._id }, { $set: { slug: '__root__' } });
      console.log(`Updated page ${p._id} (${p.url}) -> slug '__root__'`);
      updated++;
    }

    console.log(`Migration complete. Updated: ${updated}, Skipped: ${skipped}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
})();
