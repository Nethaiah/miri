import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_ubfHosvjPY42@ep-misty-heart-a1oqwmjs-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');
export const db = drizzle({ client: sql });
