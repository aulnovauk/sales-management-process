import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth';
import { useApp } from '@/contexts/app';
import Colors from '@/constants/colors';
import { Event, Circle } from '@/types';
import { CIRCLES_FALLBACK, EVENT_CATEGORIES } from '@/constants/app';
import { trpc } from '@/lib/trpc';

export default function CreateEventScreen() {
  const router = useRouter();
  const { employee } = useAuth();
  const { addEvent } = useApp();
  
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [circle, setCircle] = useState<string>(employee?.circle || 'MAHARASHTRA');
  const [zone, setZone] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState<any>('Cultural');
  const [targetSim, setTargetSim] = useState('');
  const [targetFtth, setTargetFtth] = useState('');
  const [allocatedSim, setAllocatedSim] = useState('');
  const [allocatedFtth, setAllocatedFtth] = useState('');
  const [keyInsight, setKeyInsight] = useState('');
  const [assignedToStaffId, setAssignedToStaffId] = useState('');
  const [assignedEmployee, setAssignedEmployee] = useState<{ id: string; name: string; employeeNo: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingStaff, setIsSearchingStaff] = useState(false);

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showCirclePicker, setShowCirclePicker] = useState(false);

  const circlesQuery = trpc.circles.getAll.useQuery();
  
  const circlesList = circlesQuery.data && circlesQuery.data.length > 0 
    ? circlesQuery.data.map(c => ({ label: c.label, value: c.value }))
    : CIRCLES_FALLBACK;

  const staffSearchQuery = trpc.employees.getByStaffId.useQuery(
    { staffId: assignedToStaffId },
    { enabled: assignedToStaffId.length >= 3 }
  );

  useEffect(() => {
    if (staffSearchQuery.isSuccess) {
      const data = staffSearchQuery.data;
      if (data) {
        setAssignedEmployee({ 
          id: data.id, 
          name: data.name, 
          employeeNo: data.employeeNo || '' 
        });
      } else {
        setAssignedEmployee(null);
      }
      setIsSearchingStaff(false);
    } else if (staffSearchQuery.isError) {
      setAssignedEmployee(null);
      setIsSearchingStaff(false);
    }
  }, [staffSearchQuery.data, staffSearchQuery.isSuccess, staffSearchQuery.isError]);

  const handleStaffIdChange = (text: string) => {
    setAssignedToStaffId(text);
    setAssignedEmployee(null);
    if (text.length >= 3) {
      setIsSearchingStaff(true);
    }
  };

  const getCircleLabel = (value: string) => {
    const found = circlesList.find(c => c.value === value);
    return found ? found.label : value;
  };

  const createEventMutation = trpc.events.create.useMutation({
    onSuccess: async (data) => {
      console.log('Event created in database:', data.id);
      const newEvent: Event = {
        id: data.id,
        name: data.name,
        location: data.location,
        circle: data.circle as Circle,
        zone: data.zone,
        dateRange: {
          startDate: data.startDate?.toISOString() || startDate,
          endDate: data.endDate?.toISOString() || endDate,
        },
        category: data.category,
        targetSim: data.targetSim,
        targetFtth: data.targetFtth,
        assignedTeam: (data.assignedTeam as string[]) || [],
        allocatedSim: data.allocatedSim,
        allocatedFtth: data.allocatedFtth,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toISOString() || new Date().toISOString(),
        keyInsight: data.keyInsight || '',
        status: (data.status as 'draft' | 'active' | 'paused' | 'completed' | 'cancelled') || 'active',
      };
      await addEvent(newEvent);
      setIsSubmitting(false);
      Alert.alert('Success', 'Event created successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      console.error('Failed to create event:', error);
      setIsSubmitting(false);
      Alert.alert('Error', error.message || 'Failed to create event');
    },
  });

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter event name');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Error', 'Please enter location');
      return;
    }
    if (!startDate.trim()) {
      Alert.alert('Error', 'Please enter start date');
      return;
    }
    if (!endDate.trim()) {
      Alert.alert('Error', 'Please enter end date');
      return;
    }
    if (!employee?.id) {
      Alert.alert('Error', 'You must be logged in to create an event');
      return;
    }

    setIsSubmitting(true);

    try {
      createEventMutation.mutate({
        name: name.trim(),
        location: location.trim(),
        circle: circle as any,
        zone: zone.trim() || 'Default',
        startDate: startDate,
        endDate: endDate,
        category: category,
        targetSim: parseInt(targetSim) || 0,
        targetFtth: parseInt(targetFtth) || 0,
        assignedTeam: [],
        allocatedSim: parseInt(allocatedSim) || 0,
        allocatedFtth: parseInt(allocatedFtth) || 0,
        keyInsight: keyInsight.trim() || undefined,
        assignedTo: assignedEmployee?.id,
        assignedToStaffId: assignedToStaffId.trim() || undefined,
        createdBy: employee.id,
      });
    } catch (error) {
      console.error('Event creation error:', error);
      setIsSubmitting(false);
      Alert.alert('Error', 'Failed to create event');
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Create Event',
          headerStyle: {
            backgroundColor: Colors.light.primary,
          },
          headerTintColor: Colors.light.background,
          headerTitleStyle: {
            fontWeight: 'bold' as const,
          },
        }} 
      />
      <ScrollView style={styles.container}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Event Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter event name"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter location"
              value={location}
              onChangeText={setLocation}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Circle *</Text>
            <TouchableOpacity 
              style={styles.picker}
              onPress={() => setShowCirclePicker(!showCirclePicker)}
              disabled={circlesQuery.isLoading}
            >
              {circlesQuery.isLoading ? (
                <ActivityIndicator size="small" color={Colors.light.primary} />
              ) : (
                <Text style={styles.pickerText}>{getCircleLabel(circle)}</Text>
              )}
            </TouchableOpacity>
            {showCirclePicker && (
              <View style={styles.pickerOptions}>
                <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                  {circlesList.map((c) => (
                    <TouchableOpacity
                      key={c.value}
                      style={[
                        styles.pickerOption,
                        circle === c.value && styles.pickerOptionSelected
                      ]}
                      onPress={() => {
                        setCircle(c.value);
                        setShowCirclePicker(false);
                      }}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        circle === c.value && styles.pickerOptionTextSelected
                      ]}>{c.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Zone</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter zone"
              value={zone}
              onChangeText={setZone}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category *</Text>
            <TouchableOpacity 
              style={styles.picker}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <Text style={styles.pickerText}>{category}</Text>
            </TouchableOpacity>
            {showCategoryPicker && (
              <View style={styles.pickerOptions}>
                <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                  {EVENT_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={styles.pickerOption}
                      onPress={() => {
                        setCategory(cat.value);
                        setShowCategoryPicker(false);
                      }}
                    >
                      <Text style={styles.pickerOptionText}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Start Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={startDate}
                onChangeText={setStartDate}
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>End Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={endDate}
                onChangeText={setEndDate}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>SIM Target</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={targetSim}
                onChangeText={setTargetSim}
                keyboardType="number-pad"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>FTTH Target</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={targetFtth}
                onChangeText={setTargetFtth}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Allocated SIM</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={allocatedSim}
                onChangeText={setAllocatedSim}
                keyboardType="number-pad"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Allocated FTTH</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={allocatedFtth}
                onChangeText={setAllocatedFtth}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Assign To (Staff ID) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Staff ID to assign event manager"
              value={assignedToStaffId}
              onChangeText={handleStaffIdChange}
              autoCapitalize="characters"
            />
            {(isSearchingStaff || staffSearchQuery.isLoading) && (
              <View style={styles.staffSearching}>
                <ActivityIndicator size="small" color={Colors.light.primary} />
                <Text style={styles.staffSearchingText}>Searching...</Text>
              </View>
            )}
            {assignedEmployee && (
              <View style={styles.assignedEmployeeCard}>
                <View style={styles.assignedEmployeeInfo}>
                  <Text style={styles.assignedEmployeeName}>{assignedEmployee.name}</Text>
                  <Text style={styles.assignedEmployeeId}>Staff ID: {assignedEmployee.employeeNo}</Text>
                </View>
                <TouchableOpacity
                  style={styles.clearAssigneeBtn}
                  onPress={() => {
                    setAssignedToStaffId('');
                    setAssignedEmployee(null);
                  }}
                >
                  <Text style={styles.clearAssigneeBtnText}>×</Text>
                </TouchableOpacity>
              </View>
            )}
            {assignedToStaffId.length >= 3 && !assignedEmployee && !isSearchingStaff && !staffSearchQuery.isLoading && (
              <Text style={styles.staffNotFound}>No employee found with this Staff ID</Text>
            )}
            <Text style={styles.helperText}>This person will manage the event and can create subtasks</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Key Insight</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter key insights for this event"
              value={keyInsight}
              onChangeText={setKeyInsight}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Creating...' : 'Create Event'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: Colors.light.text,
  },
  inputText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  textArea: {
    minHeight: 100,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  picker: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 14,
  },
  pickerText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  pickerOptions: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    marginTop: 8,
    maxHeight: 200,
  },
  pickerOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  pickerOptionSelected: {
    backgroundColor: Colors.light.primary + '15',
  },
  pickerOptionText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  pickerOptionTextSelected: {
    color: Colors.light.primary,
    fontWeight: '600' as const,
  },
  submitButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  bottomSpacer: {
    height: 20,
  },
  staffSearching: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  staffSearchingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  assignedEmployeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.success + '15',
    borderWidth: 1,
    borderColor: Colors.light.success,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  assignedEmployeeInfo: {
    flex: 1,
  },
  assignedEmployeeName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  assignedEmployeeId: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  clearAssigneeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.error + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearAssigneeBtnText: {
    fontSize: 18,
    color: Colors.light.error,
    fontWeight: 'bold' as const,
  },
  staffNotFound: {
    fontSize: 13,
    color: Colors.light.error,
    marginTop: 8,
  },
  helperText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 6,
    fontStyle: 'italic' as const,
  },
});
