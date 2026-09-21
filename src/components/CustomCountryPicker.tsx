import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

export interface Country {
  name: string;
  code: string;
  flag: string;
  callingCode: string;
}

interface CustomCountryPickerProps {
  selectedCountry: Country;
  onSelect: (country: Country) => void;
  visible: boolean;
  onClose: () => void;
  theme: {
    card: string;
    inputBg: string;
    inputBorder: string;
    text: string;
    placeholderText: string;
    primary: string;
  };
}

export const countries: Country[] = [
  { name: 'India', code: 'IN', flag: '🇮🇳', callingCode: '91' },
  { name: 'United States', code: 'US', flag: '🇺🇸', callingCode: '1' },
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', callingCode: '44' },
  { name: 'Canada', code: 'CA', flag: '🇨🇦', callingCode: '1' },
  { name: 'Australia', code: 'AU', flag: '🇦🇺', callingCode: '61' },
  { name: 'Germany', code: 'DE', flag: '🇩🇪', callingCode: '49' },
  { name: 'UAE', code: 'AE', flag: '🇦🇪', callingCode: '971' },
  { name: 'Singapore', code: 'SG', flag: '🇸🇬', callingCode: '65' },
  { name: 'France', code: 'FR', flag: '🇫🇷', callingCode: '33' },
  { name: 'New Zealand', code: 'NZ', flag: '🇳🇿', callingCode: '64' },
  { name: 'Ireland', code: 'IE', flag: '🇮🇪', callingCode: '353' },
  { name: 'South Africa', code: 'ZA', flag: '🇿🇦', callingCode: '27' },
];

const CustomCountryPicker: React.FC<CustomCountryPickerProps> = ({
  onSelect,
  visible,
  onClose,
  theme,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCountries = countries.filter(
    country =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.callingCode.includes(searchQuery),
  );

  const renderItem = ({ item }: { item: Country }) => (
    <TouchableOpacity
      style={[styles.countryItem, { borderBottomColor: theme.inputBorder }]}
      onPress={() => {
        onSelect(item);
        setSearchQuery('');
        onClose();
      }}
    >
      <Text style={styles.flag}>{item.flag}</Text>
      <Text style={[styles.countryName, { color: theme.text }]}>
        {item.name}
      </Text>
      <Text style={[styles.callingCode, { color: theme.text }]}>
        +{item.callingCode}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalContainer}
      >
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        
        <View style={[styles.pickerContainer, { backgroundColor: theme.card, maxHeight: Dimensions.get('window').height * 0.7 }]}>
          <View style={[styles.header, { borderBottomColor: theme.inputBorder }]}>
            <TextInput
              style={[
                styles.searchInput,
                { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.inputBorder },
              ]}
              placeholder="Search country..."
              placeholderTextColor={theme.placeholderText}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={[styles.closeButtonText, { color: theme.primary }]}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={filteredCountries}
            renderItem={renderItem}
            keyExtractor={item => item.code}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={{ color: theme.text, fontSize: 15 }}>No search results found</Text>
              </View>
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { 
    ...StyleSheet.absoluteFill, 
    backgroundColor: 'rgba(0, 0, 0, 0.4)' 
  },
  pickerContainer: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'center', paddingBottom: 12, marginBottom: 8, borderBottomWidth: 1 },
  searchInput: { flex: 1, height: 44, borderRadius: 12, paddingHorizontal: 14, marginRight: 12, borderWidth: 1, fontSize: 14 },
  closeButton: { padding: 8 },
  closeButtonText: { fontSize: 14, fontWeight: '700' },
  countryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  flag: { fontSize: 22, marginRight: 14 },
  countryName: { flex: 1, fontSize: 14, fontWeight: '500' },
  callingCode: { fontSize: 14, fontWeight: '600' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
});

export default CustomCountryPicker;