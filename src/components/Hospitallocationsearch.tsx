import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface LocationFields {
  current_location_pincode: string;
  city_district: string;
  state: string;
  address_line1: string;
  address_line2: string;
}

interface HospitalLocationSearchProps {
  googleApiKey: string;
  values: LocationFields;
  onChange: (fields: Partial<LocationFields>) => void;
  /** Optional: primary color to match your theme */
  primaryColor?: string;
}

// ── Helper: parse Google place detail into our fields ─────────────────────────
function parseAddressComponents(
  components: google.maps.GeocoderAddressComponent[],
): Partial<LocationFields> {
  const get = (type: string) =>
    components.find(c => c.types.includes(type))?.long_name || '';

  const pincode = get('postal_code');
  const city =
    get('locality') ||
    get('administrative_area_level_2') ||
    get('sublocality_level_1');
  const state = get('administrative_area_level_1');
  const area =
    get('sublocality_level_1') ||
    get('sublocality') ||
    get('neighborhood') ||
    get('premise');

  return {
    current_location_pincode: pincode,
    city_district: city,
    state,
    address_line1: area,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export const HospitalLocationSearch: React.FC<HospitalLocationSearchProps> = ({
  googleApiKey,
  values,
  onChange,
  primaryColor = '#007bbd',
}) => {
  const autocompleteRef = useRef<any>(null);

  return (
    <View style={searchStyles.container}>
      {/* ── Title ── */}
      <Text style={searchStyles.mainTitle}>
        Edit Preferred Hospital Location
      </Text>
      <Text style={searchStyles.mainSub}>
        Search or manually type the hospital location details below.
      </Text>

      {/* ── Quick Search Card ── */}
      <View style={searchStyles.card}>
        <Text style={[searchStyles.sectionLabel, { color: primaryColor }]}>
          Quick Search (Google Maps)
        </Text>

        <GooglePlacesAutocomplete
          ref={autocompleteRef}
          placeholder="Type hospital name, area, or city (e.g. Apollo Delhi)…"
          fetchDetails
          onPress={(data, detail) => {
            if (!detail?.address_components) return;
            const parsed = parseAddressComponents(
              detail.address_components as any,
            );

            // If pincode missing from components, try formatted_address
            if (!parsed.current_location_pincode) {
              const pinMatch = detail.formatted_address?.match(/\b\d{6}\b/);
              if (pinMatch) parsed.current_location_pincode = pinMatch[0];
            }

            onChange(parsed);
          }}
          query={{
            key: googleApiKey,
            language: 'en',
            components: 'country:in', // restrict to India
            types: 'establishment|geocode',
          }}
          styles={{
            container: searchStyles.acContainer,
            textInputContainer: searchStyles.acInputContainer,
            textInput: searchStyles.acInput,
            listView: searchStyles.acList,
            row: searchStyles.acRow,
            description: searchStyles.acDesc,
            poweredContainer: searchStyles.acPowered,
          }}
          renderLeftButton={() => (
            <View style={searchStyles.searchIconWrap}>
              <Text style={searchStyles.searchIconTxt}>🔍</Text>
            </View>
          )}
          renderRightButton={() =>
            autocompleteRef.current?.getAddressText() ? (
              <TouchableOpacity
                style={searchStyles.clearBtn}
                onPress={() => autocompleteRef.current?.clear()}
              >
                <Text style={searchStyles.clearTxt}>✕</Text>
              </TouchableOpacity>
            ) : null
          }
          enablePoweredByContainer={false}
          debounce={300}
          minLength={2}
          nearbyPlacesAPI="GooglePlacesSearch"
          keyboardShouldPersistTaps="handled"
          listEmptyComponent={
            <View style={searchStyles.emptyWrap}>
              <Text style={searchStyles.emptyTxt}>No results found</Text>
            </View>
          }
        />
      </View>

      {/* ── OR Divider ── */}
      <View style={searchStyles.orRow}>
        <View style={searchStyles.orLine} />
        <Text style={searchStyles.orTxt}>OR</Text>
        <View style={searchStyles.orLine} />
      </View>

      {/* ── Manual Fields ── */}
      <View style={searchStyles.card}>
        <Text style={[searchStyles.sectionLabel, { color: primaryColor }]}>
          Location Details
        </Text>

        {/* Row 1: Pincode | City | State */}
        <View style={searchStyles.row3}>
          <View style={searchStyles.col3}>
            <Text style={searchStyles.fieldLabel}>PINCODE</Text>
            <TextInput
              style={searchStyles.input}
              value={values.current_location_pincode}
              onChangeText={v => onChange({ current_location_pincode: v })}
              placeholder="110078"
              placeholderTextColor="#bbb"
              keyboardType="numeric"
              maxLength={6}
            />
          </View>
          <View style={searchStyles.col3}>
            <Text style={searchStyles.fieldLabel}>CITY</Text>
            <TextInput
              style={searchStyles.input}
              value={values.city_district}
              onChangeText={v => onChange({ city_district: v })}
              placeholder="e.g. New Delhi"
              placeholderTextColor="#bbb"
            />
          </View>
          <View style={searchStyles.col3}>
            <Text style={searchStyles.fieldLabel}>STATE</Text>
            <TextInput
              style={searchStyles.input}
              value={values.state}
              onChangeText={v => onChange({ state: v })}
              placeholder="e.g. Delhi"
              placeholderTextColor="#bbb"
            />
          </View>
        </View>

        {/* Row 2: Area (full width) */}
        <View style={{ marginTop: 12 }}>
          <Text style={searchStyles.fieldLabel}>AREA</Text>
          <TextInput
            style={searchStyles.input}
            value={values.address_line1}
            onChangeText={v => onChange({ address_line1: v })}
            placeholder="e.g. Apollo Hospital, Sarita Vihar"
            placeholderTextColor="#bbb"
          />
        </View>

        {/* Row 3: Address Line 2 */}
        <View style={{ marginTop: 12 }}>
          <Text style={searchStyles.fieldLabel}>ADDRESS LINE 2 (optional)</Text>
          <TextInput
            style={searchStyles.input}
            value={values.address_line2}
            onChangeText={v => onChange({ address_line2: v })}
            placeholder="Near landmark, flat no., etc."
            placeholderTextColor="#bbb"
          />
        </View>
      </View>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const searchStyles = StyleSheet.create({
  container: { flex: 1 },

  mainTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  mainSub: {
    fontSize: 13,
    color: '#888',
    marginBottom: 20,
    fontWeight: '500',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e8e8ee',
    padding: 16,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: 0.2,
  },

  // Google autocomplete overrides
  acContainer: { flex: 0 },
  acInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e8',
    paddingHorizontal: 4,
    height: 50,
  },
  acInput: {
    flex: 1,
    height: 50,
    fontSize: 14,
    color: '#1a1a2e',
    fontWeight: '500',
    backgroundColor: 'transparent',
  },
  acList: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e8',
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  acRow: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f4',
  },
  acDesc: { fontSize: 13, color: '#333', fontWeight: '500' },
  acPowered: { display: 'none' },

  searchIconWrap: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIconTxt: { fontSize: 16 },
  clearBtn: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearTxt: { fontSize: 14, color: '#aaa', fontWeight: '700' },

  emptyWrap: { padding: 16 },
  emptyTxt: {
    color: '#aaa',
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // OR divider
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 10,
  },
  orLine: { flex: 1, height: 1, backgroundColor: '#e0e0e8' },
  orTxt: { fontSize: 12, fontWeight: '800', color: '#aaa', letterSpacing: 1.5 },

  // Manual fields
  row3: { flexDirection: 'row', gap: 10 },
  col3: { flex: 1 },

  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#888',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f5f5fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e8',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1a1a2e',
    fontWeight: '500',
  },
});
