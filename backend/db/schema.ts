import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, pgEnum, uuid } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['GM', 'CGM', 'DGM', 'AGM', 'SD_JTO', 'SALES_STAFF']);

export const circleEnum = pgEnum('bsnl_circle', [
  'ANDAMAN_NICOBAR', 'ANDHRA_PRADESH', 'ASSAM', 'BIHAR', 'CHHATTISGARH',
  'GUJARAT', 'HARYANA', 'HIMACHAL_PRADESH', 'JAMMU_KASHMIR', 'JHARKHAND',
  'KARNATAKA', 'KERALA', 'MADHYA_PRADESH', 'MAHARASHTRA', 'NORTH_EAST_I',
  'NORTH_EAST_II', 'ODISHA', 'PUNJAB', 'RAJASTHAN', 'TAMIL_NADU',
  'TELANGANA', 'UTTARAKHAND', 'UTTAR_PRADESH_EAST', 'UTTAR_PRADESH_WEST', 'WEST_BENGAL'
]);

export const eventCategoryEnum = pgEnum('event_category', [
  'Cultural', 'Religious', 'Sports', 'Exhibition', 'Fair', 'Festival', 'Agri-Tourism', 'Eco-Tourism', 'Trade/Religious'
]);

export const issueTypeEnum = pgEnum('issue_type', [
  'MATERIAL_SHORTAGE', 'SITE_ACCESS', 'EQUIPMENT', 'NETWORK_PROBLEM', 'OTHER'
]);

export const issueStatusEnum = pgEnum('issue_status', ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);

export const customerTypeEnum = pgEnum('customer_type', ['B2C', 'B2B', 'Government', 'Enterprise']);

export const resourceTypeEnum = pgEnum('resource_type', ['SIM', 'FTTH']);

export const eventStatusEnum = pgEnum('event_status', ['draft', 'active', 'paused', 'completed', 'cancelled']);

export const subtaskStatusEnum = pgEnum('subtask_status', ['pending', 'in_progress', 'completed', 'cancelled']);

export const subtaskPriorityEnum = pgEnum('subtask_priority', ['low', 'medium', 'high', 'urgent']);

export const salesReportStatusEnum = pgEnum('sales_report_status', ['pending', 'approved', 'rejected']);

export const auditEntityTypeEnum = pgEnum('audit_entity_type', ['EVENT', 'SALES', 'RESOURCE', 'ISSUE', 'EMPLOYEE']);

export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }).notNull(),
  password: varchar('password', { length: 255 }),
  role: userRoleEnum('role').notNull(),
  circle: circleEnum('circle').notNull(),
  zone: varchar('zone', { length: 100 }).notNull(),
  reportingOfficerId: uuid('reporting_officer_id'),
  employeeNo: varchar('employee_no', { length: 50 }),
  designation: varchar('designation', { length: 100 }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  location: text('location').notNull(),
  circle: circleEnum('circle').notNull(),
  zone: varchar('zone', { length: 100 }).notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  category: eventCategoryEnum('category').notNull(),
  targetSim: integer('target_sim').default(0).notNull(),
  targetFtth: integer('target_ftth').default(0).notNull(),
  assignedTeam: jsonb('assigned_team').$type<string[]>().default([]),
  allocatedSim: integer('allocated_sim').default(0).notNull(),
  allocatedFtth: integer('allocated_ftth').default(0).notNull(),
  keyInsight: text('key_insight'),
  status: varchar('status', { length: 50 }).default('active'),
  assignedTo: uuid('assigned_to').references(() => employees.id),
  createdBy: uuid('created_by').notNull().references(() => employees.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const salesReports = pgTable('sales_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id),
  salesStaffId: uuid('sales_staff_id').notNull().references(() => employees.id),
  simsSold: integer('sims_sold').default(0).notNull(),
  simsActivated: integer('sims_activated').default(0).notNull(),
  ftthLeads: integer('ftth_leads').default(0).notNull(),
  ftthInstalled: integer('ftth_installed').default(0).notNull(),
  customerType: customerTypeEnum('customer_type').notNull(),
  photos: jsonb('photos').$type<string[]>().default([]),
  gpsLatitude: text('gps_latitude'),
  gpsLongitude: text('gps_longitude'),
  remarks: text('remarks'),
  synced: boolean('synced').default(true),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  reviewedBy: uuid('reviewed_by').references(() => employees.id),
  reviewedAt: timestamp('reviewed_at'),
  reviewRemarks: text('review_remarks'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const resources = pgTable('resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: resourceTypeEnum('type').notNull(),
  circle: circleEnum('circle').notNull(),
  total: integer('total').default(0).notNull(),
  allocated: integer('allocated').default(0).notNull(),
  used: integer('used').default(0).notNull(),
  remaining: integer('remaining').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const issues = pgTable('issues', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id),
  raisedBy: uuid('raised_by').notNull().references(() => employees.id),
  type: issueTypeEnum('type').notNull(),
  description: text('description').notNull(),
  status: issueStatusEnum('status').default('OPEN').notNull(),
  escalatedTo: uuid('escalated_to').references(() => employees.id),
  resolvedBy: uuid('resolved_by').references(() => employees.id),
  resolvedAt: timestamp('resolved_at'),
  timeline: jsonb('timeline').$type<{ action: string; performedBy: string; timestamp: string }[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  action: varchar('action', { length: 255 }).notNull(),
  entityType: auditEntityTypeEnum('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  performedBy: uuid('performed_by').notNull().references(() => employees.id),
  details: jsonb('details').$type<Record<string, unknown>>().default({}),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export const otpVerifications = pgTable('otp_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  type: varchar('type', { length: 10 }).notNull(),
  otp: varchar('otp', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const eventAssignments = pgTable('event_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  simTarget: integer('sim_target').default(0).notNull(),
  ftthTarget: integer('ftth_target').default(0).notNull(),
  simSold: integer('sim_sold').default(0).notNull(),
  ftthSold: integer('ftth_sold').default(0).notNull(),
  assignedBy: uuid('assigned_by').references(() => employees.id),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const eventSalesEntries = pgTable('event_sales_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id),
  employeeId: uuid('employee_id').notNull().references(() => employees.id),
  simsSold: integer('sims_sold').default(0).notNull(),
  simsActivated: integer('sims_activated').default(0).notNull(),
  ftthSold: integer('ftth_sold').default(0).notNull(),
  ftthActivated: integer('ftth_activated').default(0).notNull(),
  customerType: customerTypeEnum('customer_type').notNull(),
  photos: jsonb('photos').$type<{ uri: string; latitude?: string; longitude?: string; timestamp: string }[]>().default([]),
  gpsLatitude: text('gps_latitude'),
  gpsLongitude: text('gps_longitude'),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const resourceAllocations = pgTable('resource_allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  resourceId: uuid('resource_id').notNull().references(() => resources.id),
  eventId: uuid('event_id').notNull().references(() => events.id),
  quantity: integer('quantity').default(0).notNull(),
  allocatedBy: uuid('allocated_by').notNull().references(() => employees.id),
  allocatedAt: timestamp('allocated_at').defaultNow().notNull(),
});

export const eventSubtasks = pgTable('event_subtasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  assignedTo: uuid('assigned_to').references(() => employees.id),
  status: subtaskStatusEnum('status').default('pending').notNull(),
  priority: subtaskPriorityEnum('priority').default('medium').notNull(),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  completedBy: uuid('completed_by').references(() => employees.id),
  createdBy: uuid('created_by').notNull().references(() => employees.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  value: varchar('value', { length: 50 }).notNull().unique(),
  label: varchar('label', { length: 100 }).notNull(),
  hierarchy: integer('hierarchy').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const circles = pgTable('circles', {
  id: uuid('id').primaryKey().defaultRandom(),
  value: varchar('value', { length: 50 }).notNull().unique(),
  label: varchar('label', { length: 100 }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const divisionMaster = pgTable('division_master', {
  divisionId: integer('division_id').primaryKey(),
  divisionName: varchar('division_name', { length: 100 }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
