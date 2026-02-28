import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load backend .env file
dotenv.config({ path: join(__dirname, '../backend/.env') });

const { Client } = pg;

const guildId = process.argv[2];

if (!guildId) {
  console.error('Usage: node scripts/verify-guild.js <guild_id>');
  process.exit(1);
}

async function verifyGuild() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    // Check if guild exists
    const guildCheck = await client.query(
      'SELECT id, name, is_verified FROM guilds WHERE id = $1',
      [guildId]
    );
    
    if (guildCheck.rows.length === 0) {
      console.error(`Guild with ID ${guildId} not found`);
      process.exit(1);
    }
    
    const guild = guildCheck.rows[0];
    
    if (guild.is_verified) {
      console.log(`Guild "${guild.name}" is already verified`);
      process.exit(0);
    }
    
    // Verify the guild
    await client.query(
      'UPDATE guilds SET is_verified = TRUE, verified_at = NOW() WHERE id = $1',
      [guildId]
    );
    
    console.log(`✓ Successfully verified guild: ${guild.name}`);
    console.log(`  Guild ID: ${guildId}`);
    console.log(`  Verified at: ${new Date().toISOString()}`);
    
  } catch (error) {
    console.error('Error verifying guild:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyGuild();
