import { sqliteTable,text,integer } from 'drizzle-orm/sqlite-core';
export const gymState=sqliteTable('gym_state',{userId:text('user_id').primaryKey(),payload:text('payload').notNull(),version:integer('version').notNull().default(1)});
