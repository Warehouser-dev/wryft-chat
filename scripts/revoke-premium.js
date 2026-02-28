#!/usr/bin/env node

/**
 * Revoke Premium Script
 * Usage: node scripts/revoke-premium.js <email>
 * Example: node scripts/revoke-premium.js user@example.com
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Client } = pg;

// Load backend .env file
dotenv.config({ path: join(__dirname, '../backend/.env') });

async function revokePremium(email) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if user exists
    const userResult = await client.query(
      'SELECT id, username, discriminator, is_premium FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`Found user: ${user.username}#${user.discriminator}`);

    if (!user.is_premium) {
      console.log('⚠️  User does not have premium');
      process.exit(0);
    }

    // Revoke premium
    await client.query(
      `UPDATE users 
       SET is_premium = FALSE, 
           premium_since = NULL, 
           premium_expires_at = NULL 
       WHERE id = $1`,
      [user.id]
    );

    console.log('✅ Premium revoked successfully!');

  } catch (error) {
    console.error('Error revoking premium:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/revoke-premium.js <email>');
  console.log('Example: node scripts/revoke-premium.js user@example.com');
  process.exit(1);
}

const email = args[0];
revokePremium(email);
