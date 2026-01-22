import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Plus, Search, Calendar, MapPin, Users, Play, Pause, CheckCircle, XCircle, FileText } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useApp } from '@/contexts/app';
import Colors from '@/constants/colors';
import { useState, useMemo } from 'react';
import { Event, EventStatus } from '@/types';
import { canCreateEvents } from '@/constants/app';

const EVENT_STATUS_CONFIG: Record<EventStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: '#78909C', bg: '#ECEFF1' },
  active: { label: 'Active', color: '#2E7D32', bg: '#E8F5E9' },
  paused: { label: 'Paused', color: '#EF6C00', bg: '#FFF3E0' },
  completed: { label: 'Completed', color: '#1565C0', bg: '#E3F2FD' },
  cancelled: { label: 'Cancelled', color: '#C62828', bg: '#FFEBEE' },
};

export default function EventsScreen() {
  const router = useRouter();
  const { employee } = useAuth();
  const { events } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = useMemo(() => {
    let filtered = events;

    if (employee?.role !== 'GM') {
      filtered = filtered.filter(e => e.circle === employee?.circle);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered.sort((a, b) => 
      new Date(b.dateRange.startDate).getTime() - new Date(a.dateRange.startDate).getTime()
    );
  }, [events, employee, searchQuery]);

  const getEventDisplayStatus = (event: Event): { status: EventStatus | 'upcoming' | 'past'; label: string } => {
    const dbStatus = event.status as EventStatus;
    if (dbStatus && ['draft', 'paused', 'completed', 'cancelled'].includes(dbStatus)) {
      return { status: dbStatus, label: EVENT_STATUS_CONFIG[dbStatus].label };
    }
    
    const today = new Date();
    const startDate = new Date(event.dateRange.startDate);
    const endDate = new Date(event.dateRange.endDate);
    
    if (today < startDate) return { status: 'upcoming', label: 'Upcoming' };
    if (today > endDate) return { status: 'past', label: 'Past Due' };
    return { status: 'active', label: 'Active' };
  };

  const draftEvents = filteredEvents.filter(e => e.status === 'draft');
  const activeEvents = filteredEvents.filter(e => {
    const status = e.status as EventStatus;
    if (status === 'draft' || status === 'paused' || status === 'completed' || status === 'cancelled') return false;
    const today = new Date();
    const startDate = new Date(e.dateRange.startDate);
    const endDate = new Date(e.dateRange.endDate);
    return startDate <= today && endDate >= today;
  });
  const pausedEvents = filteredEvents.filter(e => e.status === 'paused');
  const upcomingEvents = filteredEvents.filter(e => {
    const status = e.status as EventStatus;
    if (status === 'draft' || status === 'paused' || status === 'completed' || status === 'cancelled') return false;
    const today = new Date();
    const startDate = new Date(e.dateRange.startDate);
    return startDate > today;
  });
  const completedEvents = filteredEvents.filter(e => e.status === 'completed');
  const cancelledEvents = filteredEvents.filter(e => e.status === 'cancelled');
  const pastEvents = filteredEvents.filter(e => {
    const status = e.status as EventStatus;
    if (status === 'draft' || status === 'paused' || status === 'completed' || status === 'cancelled') return false;
    const today = new Date();
    const endDate = new Date(e.dateRange.endDate);
    return endDate < today;
  });

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Events',
          headerStyle: {
            backgroundColor: Colors.light.primary,
          },
          headerTintColor: Colors.light.background,
          headerTitleStyle: {
            fontWeight: 'bold' as const,
          },
          headerShown: true,
          headerRight: () => (
            canCreateEvents(employee?.role || 'SALES_STAFF') ? (
              <TouchableOpacity 
                onPress={() => router.push('/create-event')}
                style={styles.headerButton}
              >
                <Plus size={24} color={Colors.light.background} />
              </TouchableOpacity>
            ) : null
          ),
        }} 
      />
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.light.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView style={styles.scrollView}>
          {draftEvents.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <FileText size={18} color="#78909C" />
                <Text style={styles.sectionTitle}>Draft Events ({draftEvents.length})</Text>
              </View>
              {draftEvents.map(event => (
                <EventCard key={event.id} event={event} getDisplayStatus={getEventDisplayStatus} />
              ))}
            </View>
          )}

          {activeEvents.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Play size={18} color="#2E7D32" />
                <Text style={styles.sectionTitle}>Active Events ({activeEvents.length})</Text>
              </View>
              {activeEvents.map(event => (
                <EventCard key={event.id} event={event} getDisplayStatus={getEventDisplayStatus} />
              ))}
            </View>
          )}

          {pausedEvents.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Pause size={18} color="#EF6C00" />
                <Text style={styles.sectionTitle}>Paused Events ({pausedEvents.length})</Text>
              </View>
              {pausedEvents.map(event => (
                <EventCard key={event.id} event={event} getDisplayStatus={getEventDisplayStatus} />
              ))}
            </View>
          )}

          {upcomingEvents.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Calendar size={18} color="#7B1FA2" />
                <Text style={styles.sectionTitle}>Upcoming Events ({upcomingEvents.length})</Text>
              </View>
              {upcomingEvents.map(event => (
                <EventCard key={event.id} event={event} getDisplayStatus={getEventDisplayStatus} />
              ))}
            </View>
          )}

          {completedEvents.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <CheckCircle size={18} color="#1565C0" />
                <Text style={styles.sectionTitle}>Completed Events ({completedEvents.length})</Text>
              </View>
              {completedEvents.map(event => (
                <EventCard key={event.id} event={event} getDisplayStatus={getEventDisplayStatus} />
              ))}
            </View>
          )}

          {pastEvents.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Calendar size={18} color="#546E7A" />
                <Text style={styles.sectionTitle}>Past Due Events ({pastEvents.length})</Text>
              </View>
              {pastEvents.map(event => (
                <EventCard key={event.id} event={event} getDisplayStatus={getEventDisplayStatus} />
              ))}
            </View>
          )}

          {cancelledEvents.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <XCircle size={18} color="#C62828" />
                <Text style={styles.sectionTitle}>Cancelled Events ({cancelledEvents.length})</Text>
              </View>
              {cancelledEvents.map(event => (
                <EventCard key={event.id} event={event} getDisplayStatus={getEventDisplayStatus} />
              ))}
            </View>
          )}

          {filteredEvents.length === 0 && (
            <View style={styles.emptyState}>
              <Calendar size={64} color={Colors.light.textSecondary} />
              <Text style={styles.emptyTitle}>No Events Found</Text>
              <Text style={styles.emptySubtitle}>
                {canCreateEvents(employee?.role || 'SALES_STAFF')
                  ? 'Tap the + button to create your first event'
                  : 'Check back later for upcoming events'}
              </Text>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </>
  );
}

function EventCard({ event, getDisplayStatus }: { event: Event; getDisplayStatus: (e: Event) => { status: EventStatus | 'upcoming' | 'past'; label: string } }) {
  const router = useRouter();
  const { status, label } = getDisplayStatus(event);
  
  const statusColors: Record<string, { color: string; bg: string }> = {
    draft: { color: '#78909C', bg: '#ECEFF1' },
    active: { color: '#2E7D32', bg: '#E8F5E9' },
    paused: { color: '#EF6C00', bg: '#FFF3E0' },
    completed: { color: '#1565C0', bg: '#E3F2FD' },
    cancelled: { color: '#C62828', bg: '#FFEBEE' },
    upcoming: { color: '#7B1FA2', bg: '#F3E5F5' },
    past: { color: '#546E7A', bg: '#ECEFF1' },
  };
  
  const statusColor = statusColors[status]?.color || Colors.light.textSecondary;
  const statusBg = statusColors[status]?.bg || '#F5F5F5';

  return (
    <TouchableOpacity 
      style={[styles.eventCard, status === 'cancelled' && styles.eventCardCancelled]}
      onPress={() => router.push(`/event-detail?id=${event.id}`)}
    >
      <View style={styles.eventHeader}>
        <Text style={[styles.eventName, status === 'cancelled' && styles.eventNameCancelled]}>{event.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {label}
          </Text>
        </View>
      </View>
      
      <View style={styles.eventDetails}>
        <View style={styles.eventDetail}>
          <MapPin size={16} color={Colors.light.textSecondary} />
          <Text style={styles.eventDetailText}>{event.location}</Text>
        </View>
        <View style={styles.eventDetail}>
          <Calendar size={16} color={Colors.light.textSecondary} />
          <Text style={styles.eventDetailText}>
            {new Date(event.dateRange.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(event.dateRange.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <View style={styles.eventDetail}>
          <Users size={16} color={Colors.light.textSecondary} />
          <Text style={styles.eventDetailText}>{event.assignedTeam.length} team members</Text>
        </View>
      </View>

      <View style={styles.eventCategory}>
        <Text style={styles.categoryText}>{event.category}</Text>
      </View>

      <View style={styles.eventTargets}>
        <View style={styles.targetItem}>
          <Text style={styles.targetLabel}>SIM Target</Text>
          <Text style={styles.targetValue}>{event.targetSim}</Text>
        </View>
        <View style={styles.targetItem}>
          <Text style={styles.targetLabel}>FTTH Target</Text>
          <Text style={styles.targetValue}>{event.targetFtth}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  headerButton: {
    marginRight: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
  },
  eventCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventCardCancelled: {
    opacity: 0.7,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
    flex: 1,
    marginRight: 8,
  },
  eventNameCancelled: {
    textDecorationLine: 'line-through',
    color: Colors.light.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  eventDetails: {
    gap: 8,
    marginBottom: 12,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  eventCategory: {
    backgroundColor: Colors.light.lightBlue,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 12,
    color: Colors.light.primary,
    fontWeight: '600' as const,
  },
  eventTargets: {
    flexDirection: 'row',
    gap: 16,
  },
  targetItem: {
    flex: 1,
  },
  targetLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  targetValue: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 20,
  },
});
