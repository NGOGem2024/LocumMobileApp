import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native';
import PrivacyPolicyModal from './PrivacyPolicyModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  termsAccepted: boolean;
  dataConsentAccepted: boolean;
  setTermsAccepted: (v: boolean) => void;
  setDataConsentAccepted: (v: boolean) => void;
  onSubmit: () => void;
}

const TermsModal: React.FC<Props> = ({
  visible,
  onClose,
  termsAccepted,
  dataConsentAccepted,
  setTermsAccepted,
  setDataConsentAccepted,
  onSubmit,
}) => {
  const [privacyVisible, setPrivacyVisible] = useState(false);

  return (
    <>
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                Terms and Conditions for Medical Practitioners
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.lastUpdated}>Last Updated: 20/04/2026</Text>

            <ScrollView
              style={styles.scrollArea}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.intro}>
                Welcome to Healtrack.ai. By completing your registration, you
                (the "Doctor" or "Practitioner") agree to be bound by the
                following Terms and Conditions. Please read these carefully
                before clicking "I Agree."
              </Text>

              {/* SECTION 1 */}
              <Text style={styles.sectionTitle}>
                1. Professional Verification & Registration
              </Text>
              <Text style={styles.bulletText}>
                • Accuracy of Data: You represent that all information provided
                during registration—including medical degrees, licenses, and
                certifications—is true and accurate.
              </Text>
              <Text style={styles.bulletText}>
                • Credentialing: You authorize Healtrack.ai to conduct primary
                source verification of your credentials with relevant medical
                boards and councils.
              </Text>
              <Text style={styles.bulletText}>
                • License Maintenance: You must maintain an active, unrestricted
                license to practice medicine in the jurisdiction of your
                placement. You agree to notify Healtrack.ai within 24 hours of
                any change in your licensure status, pending disciplinary
                actions, or malpractice claims.
              </Text>

              {/* SECTION 2 */}
              <Text style={styles.sectionTitle}>
                2. The Matching & Placement Process
              </Text>
              <Text style={styles.bulletText}>
                • Role of Healtrack.ai: Healtrack.ai acts as a facilitator to
                map your qualifications to vacancies provided by partner
                hospitals.
              </Text>
              <Text style={styles.bulletText}>
                • No Guarantee of Placement: Registration on the platform does
                not guarantee a placement or an offer of employment from a
                hospital.
              </Text>
              <Text style={styles.bulletText}>
                • Engagement Terms: Once a "match" is confirmed, you may be
                required to sign a specific "Assignment Addendum" or "Offer
                Letter" detailing the shift timings, department, and
                hospital-specific protocols.
              </Text>

              {/* SECTION 3 */}
              <Text style={styles.sectionTitle}>3. Payroll & Remuneration</Text>
              <Text style={styles.bulletText}>
                • Payroll Administration: Healtrack.ai manages the payroll
                process on behalf of the hospital or as your direct employer.
              </Text>
              <Text style={styles.bulletText}>
                • Timesheet Submission: To ensure timely payment, you must
                submit verified timesheets or digital check-ins through the
                Healtrack.ai app.
              </Text>
              <Text style={styles.bulletText}>
                • Taxation & Deductions: All payments are subject to statutory
                deductions (e.g., TDS, Income Tax, Social Security).
              </Text>
              <Text style={styles.bulletText}>
                • Payment Cycles: Payments will be disbursed on a
                Monthly/Fortnightly basis.
              </Text>

              {/* SECTION 4 */}
              <Text style={styles.sectionTitle}>
                4. Professional Conduct & Standards
              </Text>
              <Text style={styles.bulletText}>
                • Clinical Autonomy: Your clinical decisions remain your
                responsibility.
              </Text>
              <Text style={styles.bulletText}>
                • Compliance: You agree to adhere to hospital policies.
              </Text>
              <Text style={styles.bulletText}>
                • Confidentiality: You must maintain strict patient
                confidentiality.
              </Text>

              {/* SECTION 5 */}
              <Text style={styles.sectionTitle}>
                5. Non-Circumvention & Direct Hiring
              </Text>
              <Text style={styles.bulletText}>
                • Placement Integrity: You agree not to bypass Healtrack.ai for
                direct hiring.
              </Text>

              {/* SECTION 6 */}
              <Text style={styles.sectionTitle}>
                6. Limitation of Liability & Indemnity
              </Text>
              <Text style={styles.bulletText}>
                • Clinical Liability: Healtrack.ai is not liable for clinical
                outcomes.
              </Text>
              <Text style={styles.bulletText}>
                • Indemnity: You agree to indemnify Healtrack.ai.
              </Text>

              {/* SECTION 7 */}
              <Text style={styles.sectionTitle}>7. Termination of Account</Text>
              <Text style={styles.bulletText}>
                • By Doctor: You may deactivate your account anytime.
              </Text>
              <Text style={styles.bulletText}>
                • By Healtrack.ai: Account may be suspended if terms are
                violated.
              </Text>

              {/* Declaration */}
              <View style={styles.declarationBox}>
                <Text style={styles.declarationTitle}>Declaration</Text>
                <Text style={styles.declarationText}>
                  I hereby declare that I have read the above Terms and
                  Conditions. I understand that my registration is subject to
                  verification and that Healtrack.ai will handle my payroll and
                  placement mapping based on the data I provide.
                </Text>
              </View>
            </ScrollView>

            {/* CHECKBOXES */}
            <View style={styles.checkArea}>
              {/* Checkbox 1 — Terms */}
              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setTermsAccepted(!termsAccepted)}
              >
                <View
                  style={[styles.checkbox, termsAccepted && styles.checkboxOn]}
                >
                  {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkLabel}>
                  I accept the Terms and Conditions
                </Text>
              </TouchableOpacity>

              {/* Checkbox 2 — Privacy Policy */}
              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setDataConsentAccepted(!dataConsentAccepted)}
              >
                <View
                  style={[
                    styles.checkbox,
                    dataConsentAccepted && styles.checkboxOn,
                  ]}
                >
                  {dataConsentAccepted && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <Text style={styles.checkLabel}>
                  I consent to the processing of my professional data as per the{' '}
                  <Text
                    style={styles.privacyLink}
                    onPress={() => setPrivacyVisible(true)}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.agreeBtn,
                  (!termsAccepted || !dataConsentAccepted) &&
                    styles.agreeBtnOff,
                ]}
                disabled={!termsAccepted || !dataConsentAccepted}
                onPress={onSubmit}
              >
                <Text style={styles.agreeBtnText}>I Agree & Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy Modal — rendered outside the first Modal to stack on top */}
      <PrivacyPolicyModal
        visible={privacyVisible}
        onClose={() => setPrivacyVisible(false)}
      />
    </>
  );
};

export default TermsModal;

const scale = (size: number) => size;

const C = {
  primary: '#007b8e',
  primaryDark: '#005f6e',
  primaryLight: '#e0f5f8',
  white: '#ffffff',
  text: '#0d2b30',
  textSub: '#4a7a82',
  textMuted: '#9ab8bc',
  border: '#c8e8ed',
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,20,25,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    maxHeight: '92%',
    paddingTop: scale(16),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingBottom: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: '#eef6f7',
  },
  headerTitle: {
    fontSize: scale(17),
    fontWeight: '800',
    color: C.text,
    flex: 1,
    paddingRight: scale(10),
  },
  closeBtn: {
    fontSize: scale(18),
    color: C.textMuted,
    padding: scale(4),
  },
  lastUpdated: {
    fontSize: scale(11),
    color: C.textMuted,
    paddingHorizontal: scale(20),
    paddingTop: scale(8),
    paddingBottom: scale(4),
  },
  scrollArea: {
    paddingHorizontal: scale(20),
    paddingTop: scale(8),
  },
  intro: {
    fontSize: scale(13),
    color: C.textSub,
    lineHeight: scale(20),
    marginBottom: scale(16),
  },
  sectionTitle: {
    fontSize: scale(13),
    fontWeight: '700',
    color: C.text,
    marginBottom: scale(6),
    marginTop: scale(10),
  },
  bulletText: {
    flex: 1,
    fontSize: scale(12),
    color: C.textSub,
    lineHeight: scale(19),
    marginBottom: scale(4),
  },
  declarationBox: {
    backgroundColor: C.primaryLight,
    borderRadius: scale(12),
    padding: scale(14),
    marginTop: scale(12),
    marginBottom: scale(8),
  },
  declarationTitle: {
    fontSize: scale(13),
    fontWeight: '700',
    color: C.primaryDark,
    marginBottom: scale(6),
  },
  declarationText: {
    fontSize: scale(12),
    color: C.primaryDark,
    lineHeight: scale(19),
  },
  checkArea: {
    paddingHorizontal: scale(20),
    paddingTop: scale(14),
    paddingBottom: Platform.OS === 'ios' ? 36 : scale(24),
    borderTopWidth: 1,
    borderTopColor: '#eef6f7',
    gap: scale(12),
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(10),
  },
  checkbox: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(6),
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale(1),
    flexShrink: 0,
  },
  checkboxOn: {
    borderColor: C.primary,
    backgroundColor: C.primary,
  },
  checkmark: {
    fontSize: scale(13),
    color: C.white,
    fontWeight: '800',
  },
  checkLabel: {
    flex: 1,
    fontSize: scale(13),
    color: C.text,
    lineHeight: scale(19),
  },
  privacyLink: {
    color: C.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  agreeBtn: {
    backgroundColor: C.primary,
    borderRadius: scale(12),
    paddingVertical: scale(14),
    alignItems: 'center',
    marginTop: scale(4),
  },
  agreeBtnOff: {
    opacity: 0.4,
  },
  agreeBtnText: {
    color: C.white,
    fontSize: scale(15),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
