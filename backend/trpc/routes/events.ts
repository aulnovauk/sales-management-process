import { z } from "zod";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { db, events, employees, auditLogs, eventAssignments, eventSalesEntries, eventSubtasks } from "@/backend/db";

export const eventsRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(z.object({
      circle: z.string().optional(),
      zone: z.string().optional(),
      category: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      console.log("Fetching all events", input);
      const results = await db.select().from(events).orderBy(desc(events.createdAt));
      return results;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      console.log("Fetching event by id:", input.id);
      const result = await db.select().from(events).where(eq(events.id, input.id));
      return result[0] || null;
    }),

  create: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      location: z.string().min(1),
      circle: z.enum(['ANDAMAN_NICOBAR', 'ANDHRA_PRADESH', 'ASSAM', 'BIHAR', 'CHHATTISGARH', 'GUJARAT', 'HARYANA', 'HIMACHAL_PRADESH', 'JAMMU_KASHMIR', 'JHARKHAND', 'KARNATAKA', 'KERALA', 'MADHYA_PRADESH', 'MAHARASHTRA', 'NORTH_EAST_I', 'NORTH_EAST_II', 'ODISHA', 'PUNJAB', 'RAJASTHAN', 'TAMIL_NADU', 'TELANGANA', 'UTTARAKHAND', 'UTTAR_PRADESH_EAST', 'UTTAR_PRADESH_WEST', 'WEST_BENGAL']),
      zone: z.string().min(1),
      startDate: z.string(),
      endDate: z.string(),
      category: z.enum(['Cultural', 'Religious', 'Sports', 'Exhibition', 'Fair', 'Festival', 'Agri-Tourism', 'Eco-Tourism', 'Trade/Religious']),
      targetSim: z.number().min(0),
      targetFtth: z.number().min(0),
      assignedTeam: z.array(z.string()).optional(),
      allocatedSim: z.number().min(0),
      allocatedFtth: z.number().min(0),
      keyInsight: z.string().optional(),
      assignedTo: z.string().uuid().optional(),
      assignedToStaffId: z.string().optional(),
      createdBy: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      console.log("Creating event:", input.name);
      
      let assignedToId = input.assignedTo;
      
      if (input.assignedToStaffId && !assignedToId) {
        const employeeByStaffId = await db.select().from(employees)
          .where(eq(employees.employeeNo, input.assignedToStaffId));
        if (employeeByStaffId[0]) {
          assignedToId = employeeByStaffId[0].id;
        }
      }
      
      const result = await db.insert(events).values({
        name: input.name,
        location: input.location,
        circle: input.circle,
        zone: input.zone,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        category: input.category,
        targetSim: input.targetSim,
        targetFtth: input.targetFtth,
        assignedTeam: input.assignedTeam || [],
        allocatedSim: input.allocatedSim,
        allocatedFtth: input.allocatedFtth,
        keyInsight: input.keyInsight,
        assignedTo: assignedToId,
        createdBy: input.createdBy,
      }).returning();
      
      if (assignedToId) {
        const existingAssignment = await db.select().from(eventAssignments)
          .where(and(
            eq(eventAssignments.eventId, result[0].id),
            eq(eventAssignments.employeeId, assignedToId)
          ));
        
        if (!existingAssignment[0]) {
          await db.insert(eventAssignments).values({
            eventId: result[0].id,
            employeeId: assignedToId,
            simTarget: 0,
            ftthTarget: 0,
            assignedBy: input.createdBy,
          });
          
          await db.update(events)
            .set({ assignedTeam: [assignedToId], updatedAt: new Date() })
            .where(eq(events.id, result[0].id));
        }
      }

      await db.insert(auditLogs).values({
        action: 'CREATE_EVENT',
        entityType: 'EVENT',
        entityId: result[0].id,
        performedBy: input.createdBy,
        details: { eventName: input.name },
      });

      return result[0];
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      location: z.string().min(1).optional(),
      circle: z.enum(['ANDAMAN_NICOBAR', 'ANDHRA_PRADESH', 'ASSAM', 'BIHAR', 'CHHATTISGARH', 'GUJARAT', 'HARYANA', 'HIMACHAL_PRADESH', 'JAMMU_KASHMIR', 'JHARKHAND', 'KARNATAKA', 'KERALA', 'MADHYA_PRADESH', 'MAHARASHTRA', 'NORTH_EAST_I', 'NORTH_EAST_II', 'ODISHA', 'PUNJAB', 'RAJASTHAN', 'TAMIL_NADU', 'TELANGANA', 'UTTARAKHAND', 'UTTAR_PRADESH_EAST', 'UTTAR_PRADESH_WEST', 'WEST_BENGAL']).optional(),
      zone: z.string().min(1).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      category: z.enum(['Cultural', 'Religious', 'Sports', 'Exhibition', 'Fair', 'Festival', 'Agri-Tourism', 'Eco-Tourism', 'Trade/Religious']).optional(),
      targetSim: z.number().min(0).optional(),
      targetFtth: z.number().min(0).optional(),
      assignedTeam: z.array(z.string()).optional(),
      allocatedSim: z.number().min(0).optional(),
      allocatedFtth: z.number().min(0).optional(),
      keyInsight: z.string().optional(),
      status: z.string().optional(),
      assignedTo: z.string().uuid().nullable().optional(),
      updatedBy: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      console.log("Updating event:", input.id);
      const { id, updatedBy, startDate, endDate, ...updateData } = input;
      
      const updateValues: Record<string, unknown> = { ...updateData, updatedAt: new Date() };
      if (startDate) updateValues.startDate = new Date(startDate);
      if (endDate) updateValues.endDate = new Date(endDate);
      
      const result = await db.update(events)
        .set(updateValues)
        .where(eq(events.id, id))
        .returning();

      await db.insert(auditLogs).values({
        action: 'UPDATE_EVENT',
        entityType: 'EVENT',
        entityId: id,
        performedBy: updatedBy,
        details: updateData,
      });

      return result[0];
    }),

  delete: publicProcedure
    .input(z.object({ 
      id: z.string().uuid(),
      deletedBy: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      console.log("Deleting event:", input.id);
      await db.update(events)
        .set({ status: 'deleted', updatedAt: new Date() })
        .where(eq(events.id, input.id));

      await db.insert(auditLogs).values({
        action: 'DELETE_EVENT',
        entityType: 'EVENT',
        entityId: input.id,
        performedBy: input.deletedBy,
        details: {},
      });

      return { success: true };
    }),

  getByCircle: publicProcedure
    .input(z.object({ 
      circle: z.enum(['ANDAMAN_NICOBAR', 'ANDHRA_PRADESH', 'ASSAM', 'BIHAR', 'CHHATTISGARH', 'GUJARAT', 'HARYANA', 'HIMACHAL_PRADESH', 'JAMMU_KASHMIR', 'JHARKHAND', 'KARNATAKA', 'KERALA', 'MADHYA_PRADESH', 'MAHARASHTRA', 'NORTH_EAST_I', 'NORTH_EAST_II', 'ODISHA', 'PUNJAB', 'RAJASTHAN', 'TAMIL_NADU', 'TELANGANA', 'UTTARAKHAND', 'UTTAR_PRADESH_EAST', 'UTTAR_PRADESH_WEST', 'WEST_BENGAL'])
    }))
    .query(async ({ input }) => {
      console.log("Fetching events by circle:", input.circle);
      const result = await db.select().from(events)
        .where(eq(events.circle, input.circle))
        .orderBy(desc(events.createdAt));
      return result;
    }),

  getActiveEvents: publicProcedure
    .query(async () => {
      console.log("Fetching active events");
      const now = new Date();
      const result = await db.select().from(events)
        .where(and(
          lte(events.startDate, now),
          gte(events.endDate, now),
          eq(events.status, 'active')
        ))
        .orderBy(desc(events.startDate));
      return result;
    }),

  getUpcomingEvents: publicProcedure
    .query(async () => {
      console.log("Fetching upcoming events");
      const now = new Date();
      const result = await db.select().from(events)
        .where(and(
          gte(events.startDate, now),
          eq(events.status, 'active')
        ))
        .orderBy(events.startDate);
      return result;
    }),

  assignTeam: publicProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      employeeIds: z.array(z.string().uuid()),
      assignedBy: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      console.log("Assigning team to event:", input.eventId);
      
      for (const employeeId of input.employeeIds) {
        await db.insert(eventAssignments).values({
          eventId: input.eventId,
          employeeId: employeeId,
          assignedBy: input.assignedBy,
        }).onConflictDoNothing();
      }

      await db.update(events)
        .set({ assignedTeam: input.employeeIds, updatedAt: new Date() })
        .where(eq(events.id, input.eventId));

      await db.insert(auditLogs).values({
        action: 'ASSIGN_TEAM',
        entityType: 'EVENT',
        entityId: input.eventId,
        performedBy: input.assignedBy,
        details: { employeeIds: input.employeeIds },
      });

      return { success: true };
    }),

  getEventWithDetails: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      console.log("Fetching event with details - Input ID:", input.id);
      
      if (!input.id || input.id.trim() === '') {
        console.error("getEventWithDetails: Empty ID provided");
        throw new Error("Event ID is required");
      }
      
      try {
        const eventResult = await db.select().from(events).where(eq(events.id, input.id));
        console.log("Event query result:", eventResult.length > 0 ? "Found" : "Not found");
        
        if (!eventResult[0]) {
          console.log("No event found with ID:", input.id);
          return null;
        }
      
      const assignments = await db.select().from(eventAssignments)
        .where(eq(eventAssignments.eventId, input.id));
      
      const salesEntries = await db.select().from(eventSalesEntries)
        .where(eq(eventSalesEntries.eventId, input.id))
        .orderBy(desc(eventSalesEntries.createdAt));
      
      const subtasks = await db.select().from(eventSubtasks)
        .where(eq(eventSubtasks.eventId, input.id))
        .orderBy(desc(eventSubtasks.createdAt));
      
      const assignedEmployeeIds = assignments.map(a => a.employeeId);
      const subtaskAssigneeIds = subtasks.map(s => s.assignedTo).filter(Boolean) as string[];
      const allEmployeeIds = [...new Set([...assignedEmployeeIds, ...subtaskAssigneeIds])];
      
      let teamMembers: any[] = [];
      if (allEmployeeIds.length > 0) {
        teamMembers = await db.select().from(employees)
          .where(sql`${employees.id} IN ${allEmployeeIds}`);
      }
      
      const teamWithAllocations = assignments.map(assignment => {
        const employee = teamMembers.find(e => e.id === assignment.employeeId);
        const memberSales = salesEntries.filter(s => s.employeeId === assignment.employeeId);
        const totalSimsSold = memberSales.reduce((sum, s) => sum + s.simsSold, 0);
        const totalFtthSold = memberSales.reduce((sum, s) => sum + s.ftthSold, 0);
        
        return {
          ...assignment,
          employee,
          actualSimSold: totalSimsSold,
          actualFtthSold: totalFtthSold,
          salesEntries: memberSales,
        };
      });
      
      const subtasksWithAssignees = subtasks.map(subtask => ({
        ...subtask,
        assignedEmployee: subtask.assignedTo ? teamMembers.find(e => e.id === subtask.assignedTo) : undefined,
      }));
      
      const totalSimsSold = salesEntries.reduce((sum, s) => sum + s.simsSold, 0);
      const totalFtthSold = salesEntries.reduce((sum, s) => sum + s.ftthSold, 0);
      
      const subtaskStats = {
        total: subtasks.length,
        completed: subtasks.filter(s => s.status === 'completed').length,
        pending: subtasks.filter(s => s.status === 'pending').length,
        inProgress: subtasks.filter(s => s.status === 'in_progress').length,
      };
      
      let assignedToEmployee = undefined;
      if (eventResult[0].assignedTo) {
        const assignee = await db.select().from(employees)
          .where(eq(employees.id, eventResult[0].assignedTo));
        assignedToEmployee = assignee[0];
      }
      
      const result = {
          ...eventResult[0],
          assignedToEmployee,
          teamWithAllocations,
          salesEntries,
          subtasks: subtasksWithAssignees,
          summary: {
            totalSimsSold,
            totalFtthSold,
            totalEntries: salesEntries.length,
            teamCount: assignments.length,
            subtaskStats,
          },
        };
        
        console.log("Returning event details for:", result.name);
        return result;
      } catch (error) {
        console.error("Error fetching event details:", error);
        throw error;
      }
    }),

  assignTeamMember: publicProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      employeeId: z.string().uuid(),
      simTarget: z.number().min(0),
      ftthTarget: z.number().min(0),
      assignedBy: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      console.log("Assigning team member with targets:", input);
      
      const existing = await db.select().from(eventAssignments)
        .where(and(
          eq(eventAssignments.eventId, input.eventId),
          eq(eventAssignments.employeeId, input.employeeId)
        ));
      
      if (existing[0]) {
        await db.update(eventAssignments)
          .set({
            simTarget: input.simTarget,
            ftthTarget: input.ftthTarget,
            updatedAt: new Date(),
          })
          .where(eq(eventAssignments.id, existing[0].id));
      } else {
        await db.insert(eventAssignments).values({
          eventId: input.eventId,
          employeeId: input.employeeId,
          simTarget: input.simTarget,
          ftthTarget: input.ftthTarget,
          assignedBy: input.assignedBy,
        });
        
        const event = await db.select().from(events).where(eq(events.id, input.eventId));
        if (event[0]) {
          const currentTeam = (event[0].assignedTeam || []) as string[];
          if (!currentTeam.includes(input.employeeId)) {
            await db.update(events)
              .set({ assignedTeam: [...currentTeam, input.employeeId], updatedAt: new Date() })
              .where(eq(events.id, input.eventId));
          }
        }
      }

      await db.insert(auditLogs).values({
        action: 'ASSIGN_TEAM_MEMBER',
        entityType: 'EVENT',
        entityId: input.eventId,
        performedBy: input.assignedBy,
        details: { employeeId: input.employeeId, simTarget: input.simTarget, ftthTarget: input.ftthTarget },
      });

      return { success: true };
    }),

  removeTeamMember: publicProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      employeeId: z.string().uuid(),
      removedBy: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      console.log("Removing team member:", input);
      
      await db.delete(eventAssignments)
        .where(and(
          eq(eventAssignments.eventId, input.eventId),
          eq(eventAssignments.employeeId, input.employeeId)
        ));
      
      const event = await db.select().from(events).where(eq(events.id, input.eventId));
      if (event[0]) {
        const currentTeam = (event[0].assignedTeam || []) as string[];
        const updatedTeam = currentTeam.filter(id => id !== input.employeeId);
        await db.update(events)
          .set({ assignedTeam: updatedTeam, updatedAt: new Date() })
          .where(eq(events.id, input.eventId));
      }

      await db.insert(auditLogs).values({
        action: 'REMOVE_TEAM_MEMBER',
        entityType: 'EVENT',
        entityId: input.eventId,
        performedBy: input.removedBy,
        details: { employeeId: input.employeeId },
      });

      return { success: true };
    }),

  submitEventSales: publicProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      employeeId: z.string().uuid(),
      simsSold: z.number().min(0),
      simsActivated: z.number().min(0),
      ftthSold: z.number().min(0),
      ftthActivated: z.number().min(0),
      customerType: z.enum(['B2C', 'B2B', 'Government', 'Enterprise']),
      photos: z.array(z.object({
        uri: z.string(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        timestamp: z.string(),
      })).optional(),
      gpsLatitude: z.string().optional(),
      gpsLongitude: z.string().optional(),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      console.log("Submitting event sales:", input);
      
      const result = await db.insert(eventSalesEntries).values({
        eventId: input.eventId,
        employeeId: input.employeeId,
        simsSold: input.simsSold,
        simsActivated: input.simsActivated,
        ftthSold: input.ftthSold,
        ftthActivated: input.ftthActivated,
        customerType: input.customerType,
        photos: input.photos || [],
        gpsLatitude: input.gpsLatitude,
        gpsLongitude: input.gpsLongitude,
        remarks: input.remarks,
      }).returning();

      const assignment = await db.select().from(eventAssignments)
        .where(and(
          eq(eventAssignments.eventId, input.eventId),
          eq(eventAssignments.employeeId, input.employeeId)
        ));
      
      if (assignment[0]) {
        await db.update(eventAssignments)
          .set({
            simSold: assignment[0].simSold + input.simsSold,
            ftthSold: assignment[0].ftthSold + input.ftthSold,
            updatedAt: new Date(),
          })
          .where(eq(eventAssignments.id, assignment[0].id));
      }

      await db.insert(auditLogs).values({
        action: 'SUBMIT_EVENT_SALES',
        entityType: 'SALES',
        entityId: result[0].id,
        performedBy: input.employeeId,
        details: { eventId: input.eventId, simsSold: input.simsSold, ftthSold: input.ftthSold },
      });

      return result[0];
    }),

  getEventSalesEntries: publicProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ input }) => {
      console.log("Fetching event sales entries:", input.eventId);
      const entries = await db.select().from(eventSalesEntries)
        .where(eq(eventSalesEntries.eventId, input.eventId))
        .orderBy(desc(eventSalesEntries.createdAt));
      return entries;
    }),

  getMyAssignedEvents: publicProcedure
    .input(z.object({ employeeId: z.string().uuid() }))
    .query(async ({ input }) => {
      console.log("Fetching assigned events for employee:", input.employeeId);
      
      const assignments = await db.select().from(eventAssignments)
        .where(eq(eventAssignments.employeeId, input.employeeId));
      
      const eventIds = assignments.map(a => a.eventId);
      if (eventIds.length === 0) return [];
      
      const assignedEvents = await db.select().from(events)
        .where(sql`${events.id} IN ${eventIds}`)
        .orderBy(desc(events.startDate));
      
      return assignedEvents.map(event => {
        const assignment = assignments.find(a => a.eventId === event.id);
        return {
          ...event,
          assignment,
        };
      });
    }),

  getAvailableTeamMembers: publicProcedure
    .input(z.object({ 
      circle: z.enum(['ANDAMAN_NICOBAR', 'ANDHRA_PRADESH', 'ASSAM', 'BIHAR', 'CHHATTISGARH', 'GUJARAT', 'HARYANA', 'HIMACHAL_PRADESH', 'JAMMU_KASHMIR', 'JHARKHAND', 'KARNATAKA', 'KERALA', 'MADHYA_PRADESH', 'MAHARASHTRA', 'NORTH_EAST_I', 'NORTH_EAST_II', 'ODISHA', 'PUNJAB', 'RAJASTHAN', 'TAMIL_NADU', 'TELANGANA', 'UTTARAKHAND', 'UTTAR_PRADESH_EAST', 'UTTAR_PRADESH_WEST', 'WEST_BENGAL']),
      eventId: z.string().uuid().optional(),
    }))
    .query(async ({ input }) => {
      console.log("Fetching available team members for circle:", input.circle);
      
      const circleEmployees = await db.select().from(employees)
        .where(and(
          eq(employees.circle, input.circle),
          eq(employees.isActive, true)
        ));
      
      if (input.eventId) {
        const assignments = await db.select().from(eventAssignments)
          .where(eq(eventAssignments.eventId, input.eventId));
        const assignedIds = assignments.map(a => a.employeeId);
        
        return circleEmployees.map(emp => ({
          ...emp,
          isAssigned: assignedIds.includes(emp.id),
        }));
      }
      
      return circleEmployees.map(emp => ({ ...emp, isAssigned: false }));
    }),

  updateEventStatus: publicProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']),
      updatedBy: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      console.log("Updating event status:", input);
      
      const result = await db.update(events)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(events.id, input.eventId))
        .returning();

      await db.insert(auditLogs).values({
        action: 'UPDATE_EVENT_STATUS',
        entityType: 'EVENT',
        entityId: input.eventId,
        performedBy: input.updatedBy,
        details: { status: input.status },
      });

      return result[0];
    }),

  createSubtask: publicProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      title: z.string().min(1),
      description: z.string().optional(),
      assignedTo: z.string().uuid().optional(),
      staffId: z.string().optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
      dueDate: z.string().optional(),
      createdBy: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      console.log("Creating subtask:", input);
      
      let assignedEmployeeId = input.assignedTo;
      
      if (input.staffId && !assignedEmployeeId) {
        const employeeByStaffId = await db.select().from(employees)
          .where(eq(employees.employeeNo, input.staffId));
        if (employeeByStaffId[0]) {
          assignedEmployeeId = employeeByStaffId[0].id;
        }
      }
      
      if (assignedEmployeeId) {
        const existingAssignment = await db.select().from(eventAssignments)
          .where(and(
            eq(eventAssignments.eventId, input.eventId),
            eq(eventAssignments.employeeId, assignedEmployeeId)
          ));
        
        if (!existingAssignment[0]) {
          await db.insert(eventAssignments).values({
            eventId: input.eventId,
            employeeId: assignedEmployeeId,
            simTarget: 0,
            ftthTarget: 0,
            assignedBy: input.createdBy,
          });
          
          const event = await db.select().from(events).where(eq(events.id, input.eventId));
          if (event[0]) {
            const currentTeam = (event[0].assignedTeam || []) as string[];
            if (!currentTeam.includes(assignedEmployeeId)) {
              await db.update(events)
                .set({ assignedTeam: [...currentTeam, assignedEmployeeId], updatedAt: new Date() })
                .where(eq(events.id, input.eventId));
            }
          }
          
          await db.insert(auditLogs).values({
            action: 'AUTO_ASSIGN_TEAM_MEMBER',
            entityType: 'EVENT',
            entityId: input.eventId,
            performedBy: input.createdBy,
            details: { employeeId: assignedEmployeeId, reason: 'subtask_assignment' },
          });
        }
      }
      
      const result = await db.insert(eventSubtasks).values({
        eventId: input.eventId,
        title: input.title,
        description: input.description,
        assignedTo: assignedEmployeeId,
        priority: input.priority,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        createdBy: input.createdBy,
      }).returning();

      await db.insert(auditLogs).values({
        action: 'CREATE_SUBTASK',
        entityType: 'EVENT',
        entityId: input.eventId,
        performedBy: input.createdBy,
        details: { subtaskId: result[0].id, title: input.title, assignedTo: assignedEmployeeId },
      });

      return result[0];
    }),

  updateSubtask: publicProcedure
    .input(z.object({
      subtaskId: z.string().uuid(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      assignedTo: z.string().uuid().nullable().optional(),
      status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      dueDate: z.string().nullable().optional(),
      updatedBy: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      console.log("Updating subtask:", input);
      
      const { subtaskId, updatedBy, dueDate, ...updateData } = input;
      
      const updateValues: Record<string, unknown> = { ...updateData, updatedAt: new Date() };
      if (dueDate !== undefined) {
        updateValues.dueDate = dueDate ? new Date(dueDate) : null;
      }
      
      if (input.status === 'completed') {
        updateValues.completedAt = new Date();
        updateValues.completedBy = updatedBy;
      }
      
      const result = await db.update(eventSubtasks)
        .set(updateValues)
        .where(eq(eventSubtasks.id, subtaskId))
        .returning();

      if (result[0]) {
        await db.insert(auditLogs).values({
          action: 'UPDATE_SUBTASK',
          entityType: 'EVENT',
          entityId: result[0].eventId,
          performedBy: updatedBy,
          details: { subtaskId, changes: updateData },
        });
      }

      return result[0];
    }),

  deleteSubtask: publicProcedure
    .input(z.object({
      subtaskId: z.string().uuid(),
      deletedBy: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      console.log("Deleting subtask:", input.subtaskId);
      
      const subtask = await db.select().from(eventSubtasks).where(eq(eventSubtasks.id, input.subtaskId));
      
      await db.delete(eventSubtasks).where(eq(eventSubtasks.id, input.subtaskId));

      if (subtask[0]) {
        await db.insert(auditLogs).values({
          action: 'DELETE_SUBTASK',
          entityType: 'EVENT',
          entityId: subtask[0].eventId,
          performedBy: input.deletedBy,
          details: { subtaskId: input.subtaskId, title: subtask[0].title },
        });
      }

      return { success: true };
    }),

  updateTeamMemberTargets: publicProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      employeeId: z.string().uuid(),
      simTarget: z.number().min(0),
      ftthTarget: z.number().min(0),
      updatedBy: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      console.log("Updating team member targets:", input);
      
      const result = await db.update(eventAssignments)
        .set({
          simTarget: input.simTarget,
          ftthTarget: input.ftthTarget,
          updatedAt: new Date(),
        })
        .where(and(
          eq(eventAssignments.eventId, input.eventId),
          eq(eventAssignments.employeeId, input.employeeId)
        ))
        .returning();

      await db.insert(auditLogs).values({
        action: 'UPDATE_TEAM_TARGETS',
        entityType: 'EVENT',
        entityId: input.eventId,
        performedBy: input.updatedBy,
        details: { employeeId: input.employeeId, simTarget: input.simTarget, ftthTarget: input.ftthTarget },
      });

      return result[0];
    }),
});
