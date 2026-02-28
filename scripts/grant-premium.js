#!/usr/bin/env node

/**
 * Grant Premium Script
 * Usage: node scripts/grant-premium.js <email> [duration_days]
 * Example: node scripts/grant-premium.js user@example.com 30
 * 
 * If duration_days is not provided, grants lifetime premium
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

async function grantPremium(email, durationDays = null) {
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

    if (user.is_premium) {
      console.log('⚠️  User already has premium');
    }

    // Calculate expiration date
    const premiumSince = new Date();
    const expiresAt = durationDays 
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      : null; // null = lifetime

    // Grant premium
    await client.query(
      `UPDATE users 
       SET is_premium = TRUE, 
           premium_since = $1, 
           premium_expires_at = $2 
       WHERE id = $3`,
      [premiumSince, expiresAt, user.id]
    );

    console.log('✅ Premium granted successfully!');
    console.log(`   Premium since: ${premiumSince.toISOString()}`);
    if (expiresAt) {
      console.log(`   Expires at: ${expiresAt.toISOString()} (${durationDays} days)`);
    } else {
      console.log('   Expires at: Never (lifetime)');
    }

  } catch (error) {
    console.error('Error granting premium:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/grant-premium.js <email> [duration_days]');
  console.log('Example: node scripts/grant-premium.js user@example.com 30');
  console.log('         node scripts/grant-premium.js user@example.com (lifetime)');
  process.exit(1);
}

const email = args[0];
const durationDays = args[1] ? parseInt(args[1]) : null;

grantPremium(email, durationDays);
