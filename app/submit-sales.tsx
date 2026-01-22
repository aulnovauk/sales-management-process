import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Camera, MapPin, Trash2 } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useApp } from '@/contexts/app';
import Colors from '@/constants/colors';
import { SalesReport } from '@/types';
import { CUSTOMER_TYPES } from '@/constants/app';

export default function SubmitSalesScreen() {
  const router = useRouter();
  const { employee } = useAuth();
  const { events, addSalesReport, addAuditLog } = useApp();
  
  const [selectedEventId, setSelectedEventId] = useState('');
  const [simsSold, setSimsSold] = useState('');
  const [simsActivated, setSimsActivated] = useState('');
  const [ftthLeads, setFtthLeads] = useState('');
  const [ftthInstalled, setFtthInstalled] = useState('');
  const [customerType, setCustomerType] = useState<any>('B2C');
  const [remarks, setRemarks] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showEventPicker, setShowEventPicker] = useState(false);
  const [showCustomerTypePicker, setShowCustomerTypePicker] = useState(false);

  const myEvents = events.filter(e => {
    const today = new Date();
    const endDate = new Date(e.dateRange.endDate);
    return endDate >= today;
  });

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access gallery is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const getLocation = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Info', 'GPS location is not available on web');
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Permission to access location is required!');
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    setLocation({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });
    Alert.alert('Success', 'Location captured successfully');
  };

  const handleSubmit = async () => {
    if (!selectedEventId) {
      Alert.alert('Error', 'Please select an event');
      return;
    }
    if (!simsSold && !ftthLeads) {
      Alert.alert('Error', 'Please enter at least SIMs sold or FTTH leads');
      return;
    }

    setIsSubmitting(true);

    const newSalesReport: SalesReport = {
      id: Date.now().toString(),
      eventId: selectedEventId,
      salesStaffId: employee?.id || '',
      simsSold: parseInt(simsSold) || 0,
      simsActivated: parseInt(simsActivated) || 0,
      ftthLeads: parseInt(ftthLeads) || 0,
      ftthInstalled: parseInt(ftthInstalled) || 0,
      customerType,
      photos,
      gpsLocation: location || undefined,
      remarks: remarks.trim(),
      createdAt: new Date().toISOString(),
      synced: false,
      status: 'pending',
    };

    try {
      await addSalesReport(newSalesReport);
      await addAuditLog({
        id: Date.now().toString(),
        action: 'Submitted Sales Report',
        entityType: 'SALES',
        entityId: newSalesReport.id,
        performedBy: employee?.id || '',
        timestamp: new Date().toISOString(),
        details: { simsSold: newSalesReport.simsSold, ftthLeads: newSalesReport.ftthLeads },
      });
      
      Alert.alert('Success', 'Sales report submitted successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit sales report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Submit Sales',
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
            <Text style={styles.label}>Select Event *</Text>
            <TouchableOpacity 
              style={styles.picker}
              onPress={() => setShowEventPicker(!showEventPicker)}
            >
              <Text style={styles.pickerText}>
                {selectedEvent ? selectedEvent.name : 'Choose an event'}
              </Text>
            </TouchableOpacity>
            {showEventPicker && (
              <View style={styles.pickerOptions}>
                <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                  {myEvents.map((event) => (
                    <TouchableOpacity
                      key={event.id}
                      style={styles.pickerOption}
                      onPress={() => {
                        setSelectedEventId(event.id);
                        setShowEventPicker(false);
                      }}
                    >
                      <Text style={styles.pickerOptionText}>{event.name}</Text>
                      <Text style={styles.pickerOptionSubtext}>{event.location}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SIM Sales</Text>
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>SIMs Sold</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={simsSold}
                  onChangeText={setSimsSold}
                  keyboardType="number-pad"
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>SIMs Activated</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={simsActivated}
                  onChangeText={setSimsActivated}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FTTH</Text>
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>FTTH Leads</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={ftthLeads}
                  onChangeText={setFtthLeads}
                  keyboardType="number-pad"
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>FTTH Installed</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={ftthInstalled}
                  onChangeText={setFtthInstalled}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Customer Type *</Text>
            <TouchableOpacity 
              style={styles.picker}
              onPress={() => setShowCustomerTypePicker(!showCustomerTypePicker)}
            >
              <Text style={styles.pickerText}>{customerType}</Text>
            </TouchableOpacity>
            {showCustomerTypePicker && (
              <View style={styles.pickerOptions}>
                <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                  {CUSTOMER_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={styles.pickerOption}
                      onPress={() => {
                        setCustomerType(type.value);
                        setShowCustomerTypePicker(false);
                      }}
                    >
                      <Text style={styles.pickerOptionText}>{type.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Remarks</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any additional remarks..."
              value={remarks}
              onChangeText={setRemarks}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                <Camera size={20} color={Colors.light.background} />
                <Text style={styles.photoButtonText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                <Camera size={20} color={Colors.light.background} />
                <Text style={styles.photoButtonText}>Choose Photo</Text>
              </TouchableOpacity>
            </View>
            {photos.length > 0 && (
              <View style={styles.photosContainer}>
                {photos.map((photo, index) => (
                  <View key={index} style={styles.photoItem}>
                    <Text style={styles.photoName}>Photo {index + 1}</Text>
                    <TouchableOpacity onPress={() => removePhoto(index)}>
                      <Trash2 size={20} color={Colors.light.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <TouchableOpacity style={styles.locationButton} onPress={getLocation}>
              <MapPin size={20} color={Colors.light.background} />
              <Text style={styles.locationButtonText}>
                {location ? 'Location Captured' : 'Capture GPS Location'}
              </Text>
            </TouchableOpacity>
            {location && (
              <Text style={styles.locationText}>
                Lat: {location.latitude.toFixed(6)}, Long: {location.longitude.toFixed(6)}
              </Text>
            )}
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit Sales Report'}
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: Colors.light.text,
    marginBottom: 12,
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
  pickerOptionText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  pickerOptionSubtext: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.secondary,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  photoButtonText: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  photosContainer: {
    marginTop: 12,
    gap: 8,
  },
  photoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  photoName: {
    fontSize: 14,
    color: Colors.light.text,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  locationButtonText: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  locationText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 8,
    textAlign: 'center',
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
});
