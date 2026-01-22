import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { TrendingUp, Calendar, Users, Target, Package, AlertCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useApp } from '@/contexts/app';
import Colors from '@/constants/colors';
import { useMemo } from 'react';
import React from "react";

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const router = useRouter();
  const { employee } = useAuth();
  const { events, salesReports, resources, issues } = useApp();

  const stats = useMemo(() => {
    const myEvents = events.filter(e => 
      e.circle === employee?.circle || employee?.role === 'GM'
    );
    
    const totalSimsSold = salesReports.reduce((acc, r) => acc + r.simsSold, 0);
    const totalSimsActivated = salesReports.reduce((acc, r) => acc + r.simsActivated, 0);
    const totalFtthLeads = salesReports.reduce((acc, r) => acc + r.ftthLeads, 0);
    const totalFtthInstalled = salesReports.reduce((acc, r) => acc + r.ftthInstalled, 0);
    
    const activeEvents = myEvents.filter(e => {
      const today = new Date();
      const endDate = new Date(e.dateRange.endDate);
      return endDate >= today;
    });

    const pendingIssues = issues.filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS');

    const simResources = resources.find(r => r.type === 'SIM' && r.circle === employee?.circle);
    const ftthResources = resources.find(r => r.type === 'FTTH' && r.circle === employee?.circle);

    return {
      activeEvents: activeEvents.length,
      totalEvents: myEvents.length,
      simsSold: totalSimsSold,
      simsActivated: totalSimsActivated,
      ftthLeads: totalFtthLeads,
      ftthInstalled: totalFtthInstalled,
      pendingIssues: pendingIssues.length,
      simAvailable: simResources?.remaining || 0,
      ftthAvailable: ftthResources?.remaining || 0,
    };
  }, [events, salesReports, issues, resources, employee]);

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Dashboard',
          headerStyle: {
            backgroundColor: Colors.light.primary,
          },
          headerTintColor: Colors.light.background,
          headerTitleStyle: {
            fontWeight: 'bold' as const,
          },
          headerShown: true,
        }} 
      />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{employee?.name}</Text>
            <Text style={styles.role}>{employee?.designation} - {employee?.circle}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon={<Calendar size={24} color={Colors.light.primary} />}
            label="Active Events"
            value={stats.activeEvents.toString()}
            subtitle={`${stats.totalEvents} total`}
            color={Colors.light.primary}
            onPress={() => router.push('/(tabs)/events')}
          />
          <StatCard
            icon={<TrendingUp size={24} color={Colors.light.success} />}
            label="SIMs Sold"
            value={stats.simsSold.toString()}
            subtitle={`${stats.simsActivated} activated`}
            color={Colors.light.success}
            onPress={() => router.push('/(tabs)/sales')}
          />
          <StatCard
            icon={<Target size={24} color={Colors.light.info} />}
            label="FTTH Leads"
            value={stats.ftthLeads.toString()}
            subtitle={`${stats.ftthInstalled} installed`}
            color={Colors.light.info}
            onPress={() => router.push('/(tabs)/sales')}
          />
          <StatCard
            icon={<AlertCircle size={24} color={Colors.light.error} />}
            label="Pending Issues"
            value={stats.pendingIssues.toString()}
            subtitle="Requires attention"
            color={stats.pendingIssues > 0 ? Colors.light.error : Colors.light.success}
            onPress={() => router.push('/(tabs)/issues')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resources Available</Text>
          <View style={styles.resourcesContainer}>
            <ResourceCard
              label="SIM Stock"
              available={stats.simAvailable}
              icon={<Package size={20} color={Colors.light.primary} />}
              onPress={() => router.push('/resource-management?type=SIM')}
            />
            <ResourceCard
              label="FTTH Capacity"
              available={stats.ftthAvailable}
              icon={<Package size={20} color={Colors.light.secondary} />}
              onPress={() => router.push('/resource-management?type=FTTH')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <ActionButton 
              label="Create Event" 
              icon={<Calendar size={24} color={Colors.light.background} />} 
              onPress={() => router.push('/create-event')}
            />
            <ActionButton 
              label="Submit Sales" 
              icon={<TrendingUp size={24} color={Colors.light.background} />} 
              onPress={() => router.push('/submit-sales')}
            />
            <ActionButton 
              label="Raise Issue" 
              icon={<AlertCircle size={24} color={Colors.light.background} />} 
              onPress={() => router.push('/raise-issue')}
            />
            <ActionButton 
              label="View Reports" 
              icon={<Users size={24} color={Colors.light.background} />} 
              onPress={() => router.push('/sales')}
            />
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </>
  );
}

function StatCard({ icon, label, value, subtitle, color, onPress }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  color: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity 
      style={styles.statCard} 
      onPress={onPress} 
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.statIconContainer}>
        {icon}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

function ResourceCard({ label, available, icon, onPress }: {
  label: string;
  available: number;
  icon: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity 
      style={styles.resourceCard} 
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.resourceHeader}>
        {icon}
        <Text style={styles.resourceLabel}>{label}</Text>
      </View>
      <Text style={styles.resourceValue}>{available}</Text>
      <Text style={styles.resourceSubtitle}>units available</Text>
    </TouchableOpacity>
  );
}

function ActionButton({ label, icon, onPress }: { label: string; icon: React.ReactNode; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.actionIconContainer}>
        {icon}
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  header: {
    backgroundColor: Colors.light.primary,
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  greeting: {
    fontSize: 16,
    color: Colors.light.background,
    opacity: 0.9,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: Colors.light.background,
    marginTop: 4,
  },
  role: {
    fontSize: 14,
    color: Colors.light.background,
    opacity: 0.8,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
    marginTop: -20,
  },
  statCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    width: (width - 44) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIconContainer: {
    marginBottom: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '600' as const,
  },
  statSubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
    marginBottom: 12,
  },
  resourcesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  resourceCard: {
    flex: 1,
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  resourceLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  resourceValue: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
  },
  resourceSubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    padding: 16,
    width: (width - 44) / 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIconContainer: {
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.background,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 20,
  },
});
