import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useApp } from '@/contexts/app';
import Colors from '@/constants/colors';
import { USER_ROLES, CIRCLES_FALLBACK, DIVISIONS_FALLBACK } from '@/constants/app';
import { UserRole, Circle } from '@/types';
import { trpc } from '@/lib/trpc';

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { employees, addEmployees } = useApp();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    employeeNo: '',
    designation: '',
    role: 'SALES_STAFF' as UserRole,
    circle: 'MAHARASHTRA' as Circle,
    division: '',
    buildingName: '',
    officeName: '',
    reportingOfficerId: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [showCirclePicker, setShowCirclePicker] = useState(false);
  const [showReportingPicker, setShowReportingPicker] = useState(false);
  const [showDivisionPicker, setShowDivisionPicker] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone must be 10 digits';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.employeeNo.trim()) {
      newErrors.employeeNo = 'Employee number is required';
    }

    if (!formData.designation.trim()) {
      newErrors.designation = 'Designation is required';
    }

    if (!formData.division) {
      newErrors.division = 'Division is required';
    }

    const existingEmployee = employees.find(
      emp => emp.email === formData.email || emp.phone === formData.phone || emp.employeeNo === formData.employeeNo
    );

    if (existingEmployee) {
      if (existingEmployee.email === formData.email) {
        newErrors.email = 'Email already registered';
      }
      if (existingEmployee.phone === formData.phone) {
        newErrors.phone = 'Phone number already registered';
      }
      if (existingEmployee.employeeNo === formData.employeeNo) {
        newErrors.employeeNo = 'Employee number already exists';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createEmployeeMutation = trpc.employees.create.useMutation({
    onSuccess: async (data) => {
      console.log('Employee created in database:', data.id);
      const employeeData = {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: formData.password,
        role: data.role as UserRole,
        circle: data.circle as Circle,
        division: formData.division,
        buildingName: formData.buildingName.trim() || undefined,
        officeName: formData.officeName.trim() || undefined,
        reportingOfficerId: data.reportingOfficerId || undefined,
        employeeNo: data.employeeNo || '',
        designation: data.designation,
        createdAt: data.createdAt?.toISOString() || new Date().toISOString(),
      };
      await addEmployees([employeeData]);
      await login(employeeData);
      setIsLoading(false);
      Alert.alert('Success', 'Registration successful!', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/dashboard'),
        },
      ]);
    },
    onError: (error) => {
      console.error('Failed to create employee:', error);
      setIsLoading(false);
      Alert.alert('Error', error.message || 'Registration failed. Please try again.');
    },
  });

  const handleRegister = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors in the form');
      return;
    }

    setIsLoading(true);

    try {
      createEmployeeMutation.mutate({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: formData.role,
        circle: formData.circle,
        zone: formData.division,
        reportingOfficerId: formData.reportingOfficerId || undefined,
        employeeNo: formData.employeeNo.trim(),
        designation: formData.designation.trim(),
      });
    } catch (error) {
      console.error('Registration error:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Registration failed. Please try again.');
    }
  };

  const rolesQuery = trpc.roles.getAll.useQuery();
  const circlesQuery = trpc.circles.getAll.useQuery();
  const divisionsQuery = trpc.divisions.getAll.useQuery();

  const availableRoles = useMemo(() => {
    if (rolesQuery.data && rolesQuery.data.length > 0) {
      return rolesQuery.data.map(role => ({
        label: role.label,
        value: role.value as UserRole,
        hierarchy: role.hierarchy,
      }));
    }
    return USER_ROLES.map((role, index) => ({
      ...role,
      hierarchy: USER_ROLES.length - index,
    }));
  }, [rolesQuery.data]);

  const availableCircles = useMemo(() => {
    if (circlesQuery.data && circlesQuery.data.length > 0) {
      return circlesQuery.data.map(circle => ({
        label: circle.label,
        value: circle.value as Circle,
      }));
    }
    return CIRCLES_FALLBACK;
  }, [circlesQuery.data]);

  const availableDivisions = useMemo(() => {
    if (divisionsQuery.data && divisionsQuery.data.length > 0) {
      return divisionsQuery.data.map(division => ({
        label: division.divisionName,
        value: division.divisionId.toString(),
      }));
    }
    return DIVISIONS_FALLBACK;
  }, [divisionsQuery.data]);

  const potentialReportingOfficers = employees.filter(emp => {
    const currentRoleData = availableRoles.find(r => r.value === formData.role);
    const empRoleData = availableRoles.find(r => r.value === emp.role);
    if (!currentRoleData || !empRoleData) return false;
    return empRoleData.hierarchy > currentRoleData.hierarchy;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.light.background} />
        </TouchableOpacity>
        <Image
          source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/BSNL_Logo.svg/1200px-BSNL_Logo.svg.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>Employee Registration</Text>
          <Text style={styles.subtitle}>Create your account to access the BSNL Event & Sales Management System</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Enter your full name"
                value={formData.name}
                onChangeText={(text) => {
                  setFormData({ ...formData, name: text });
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
              />
              {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="your.email@bsnl.in"
                value={formData.email}
                onChangeText={(text) => {
                  setFormData({ ...formData, email: text });
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="10-digit mobile number"
                value={formData.phone}
                onChangeText={(text) => {
                  setFormData({ ...formData, phone: text });
                  if (errors.phone) setErrors({ ...errors, phone: '' });
                }}
                keyboardType="phone-pad"
                maxLength={10}
              />
              {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Employee Number *</Text>
              <TextInput
                style={[styles.input, errors.employeeNo && styles.inputError]}
                placeholder="Enter employee number"
                value={formData.employeeNo}
                onChangeText={(text) => {
                  setFormData({ ...formData, employeeNo: text });
                  if (errors.employeeNo) setErrors({ ...errors, employeeNo: '' });
                }}
              />
              {errors.employeeNo ? <Text style={styles.errorText}>{errors.employeeNo}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Designation *</Text>
              <TextInput
                style={[styles.input, errors.designation && styles.inputError]}
                placeholder="e.g., Senior Manager, Sales Executive"
                value={formData.designation}
                onChangeText={(text) => {
                  setFormData({ ...formData, designation: text });
                  if (errors.designation) setErrors({ ...errors, designation: '' });
                }}
              />
              {errors.designation ? <Text style={styles.errorText}>{errors.designation}</Text> : null}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChangeText={(text) => {
                  setFormData({ ...formData, password: text });
                  if (errors.password) setErrors({ ...errors, password: '' });
                }}
                secureTextEntry
                autoCapitalize="none"
              />
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password *</Text>
              <TextInput
                style={[styles.input, errors.confirmPassword && styles.inputError]}
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChangeText={(text) => {
                  setFormData({ ...formData, confirmPassword: text });
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                }}
                secureTextEntry
                autoCapitalize="none"
              />
              {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work Assignment</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Role *</Text>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => setShowRolePicker(!showRolePicker)}
              >
                <Text style={styles.pickerText}>
                  {availableRoles.find(r => r.value === formData.role)?.label || 'Select Role'}
                </Text>
              </TouchableOpacity>
              {showRolePicker && (
                <View style={styles.pickerOptions}>
                  {rolesQuery.isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={Colors.light.primary} />
                      <Text style={styles.loadingText}>Loading roles...</Text>
                    </View>
                  ) : (
                    <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                      {availableRoles.map((role) => (
                        <TouchableOpacity
                          key={role.value}
                          style={styles.pickerOption}
                          onPress={() => {
                            setFormData({ ...formData, role: role.value });
                            setShowRolePicker(false);
                          }}
                        >
                          <Text style={[
                            styles.pickerOptionText,
                            formData.role === role.value && styles.pickerOptionTextSelected
                          ]}>
                            {role.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Circle *</Text>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => setShowCirclePicker(!showCirclePicker)}
              >
                <Text style={styles.pickerText}>
                  {availableCircles.find(c => c.value === formData.circle)?.label || 'Select Circle'}
                </Text>
              </TouchableOpacity>
              {showCirclePicker && (
                <View style={styles.pickerOptions}>
                  {circlesQuery.isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={Colors.light.primary} />
                      <Text style={styles.loadingText}>Loading circles...</Text>
                    </View>
                  ) : (
                    <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                      {availableCircles.map((circle) => (
                        <TouchableOpacity
                          key={circle.value}
                          style={styles.pickerOption}
                          onPress={() => {
                            setFormData({ ...formData, circle: circle.value });
                            setShowCirclePicker(false);
                          }}
                        >
                          <Text style={[
                            styles.pickerOptionText,
                            formData.circle === circle.value && styles.pickerOptionTextSelected
                          ]}>
                            {circle.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Division *</Text>
              <TouchableOpacity
                style={[styles.picker, errors.division && styles.inputError]}
                onPress={() => setShowDivisionPicker(!showDivisionPicker)}
              >
                <Text style={styles.pickerText}>
                  {availableDivisions.find(d => d.value === formData.division)?.label || 'Select Division'}
                </Text>
              </TouchableOpacity>
              {errors.division ? <Text style={styles.errorText}>{errors.division}</Text> : null}
              {showDivisionPicker && (
                <View style={styles.pickerOptions}>
                  {divisionsQuery.isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={Colors.light.primary} />
                      <Text style={styles.loadingText}>Loading divisions...</Text>
                    </View>
                  ) : (
                    <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                      {availableDivisions.map((division) => (
                        <TouchableOpacity
                          key={division.value}
                          style={styles.pickerOption}
                          onPress={() => {
                            setFormData({ ...formData, division: division.value });
                            setShowDivisionPicker(false);
                            if (errors.division) setErrors({ ...errors, division: '' });
                          }}
                        >
                          <Text style={[
                            styles.pickerOptionText,
                            formData.division === division.value && styles.pickerOptionTextSelected
                          ]}>
                            {division.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Building Name (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter building name"
                value={formData.buildingName}
                onChangeText={(text) => setFormData({ ...formData, buildingName: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Office Name (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter office name"
                value={formData.officeName}
                onChangeText={(text) => setFormData({ ...formData, officeName: text })}
              />
            </View>

            {potentialReportingOfficers.length > 0 && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Reporting Officer (Optional)</Text>
                <TouchableOpacity
                  style={styles.picker}
                  onPress={() => setShowReportingPicker(!showReportingPicker)}
                >
                  <Text style={styles.pickerText}>
                    {formData.reportingOfficerId
                      ? employees.find(e => e.id === formData.reportingOfficerId)?.name
                      : 'Select Reporting Officer'}
                  </Text>
                </TouchableOpacity>
                {showReportingPicker && (
                  <View style={styles.pickerOptions}>
                    <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                      <TouchableOpacity
                        style={styles.pickerOption}
                        onPress={() => {
                          setFormData({ ...formData, reportingOfficerId: '' });
                          setShowReportingPicker(false);
                        }}
                      >
                        <Text style={styles.pickerOptionText}>None</Text>
                      </TouchableOpacity>
                      {potentialReportingOfficers.map((officer) => (
                        <TouchableOpacity
                          key={officer.id}
                          style={styles.pickerOption}
                          onPress={() => {
                            setFormData({ ...formData, reportingOfficerId: officer.id });
                            setShowReportingPicker(false);
                          }}
                        >
                          <Text style={[
                            styles.pickerOptionText,
                            formData.reportingOfficerId === officer.id && styles.pickerOptionTextSelected
                          ]}>
                            {officer.name} ({officer.role})
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.light.background} />
            ) : (
              <Text style={styles.buttonText}>Register</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.back()}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkTextBold}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.light.primary,
  },
  backButton: {
    marginRight: 12,
  },
  logo: {
    width: 120,
    height: 50,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  inputError: {
    borderColor: Colors.light.error,
  },
  errorText: {
    fontSize: 12,
    color: Colors.light.error,
    marginTop: 4,
  },
  picker: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 14,
    backgroundColor: Colors.light.background,
  },
  pickerText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  pickerOptions: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: Colors.light.background,
    maxHeight: 250,
  },
  pickerOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  pickerOptionText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  pickerOptionTextSelected: {
    color: Colors.light.primary,
    fontWeight: '600' as const,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  button: {
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  loginLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  loginLinkTextBold: {
    color: Colors.light.primary,
    fontWeight: '600' as const,
  },
});
