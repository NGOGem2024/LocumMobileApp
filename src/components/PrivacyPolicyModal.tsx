import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

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

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  visible,
  onClose,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Privacy Policy</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.lastUpdated}>Last Updated: April 2026</Text>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            <Text style={styles.intro}>
              At Healtrack, we are committed to protecting the privacy and
              security of our medical professionals and hospital partners. This
              Privacy Policy outlines how we collect, use, and safeguard your
              information across our website and the Healtrack mobile
              application.
            </Text>

            {/* SECTION 1 */}
            <Text style={styles.sectionTitle}>1. Information We Collect</Text>
            <Text style={styles.sectionIntro}>
              To provide our mapping and payroll services, we collect the
              following categories of data:
            </Text>
            <Text style={styles.bulletText}>
              • Professional Identity: Name, medical degree, specialization, and
              council registration/licensure details.
            </Text>
            <Text style={styles.bulletText}>
              • Contact Information: Email address, phone number, and physical
              address.
            </Text>
            <Text style={styles.bulletText}>
              • Financial Data: Bank account details and tax identification
              numbers (e.g., PAN/TDS details) for payroll administration.
            </Text>
            <Text style={styles.bulletText}>
              • Location Data: The Healtrack mobile application collects precise
              or approximate location data from your mobile device to facilitate
              the "Check-in/Check-out" feature. This verifies your physical
              presence at the designated hospital for your scheduled shift to
              ensure payroll accuracy. Location is only accessed while the app
              is in use for attendance purposes.
            </Text>
            <Text style={styles.bulletText}>
              • Usage Data: Log data, device information, and IP addresses
              through our mobile and web platforms to ensure security and app
              performance.
            </Text>

            {/* SECTION 2 */}
            <Text style={styles.sectionTitle}>
              2. How We Use Your Information
            </Text>
            <Text style={styles.sectionIntro}>
              Your data is used strictly for the following functional purposes:
            </Text>
            <Text style={styles.bulletText}>
              • Verification: To verify your medical credentials and eligibility
              to practice via primary source verification.
            </Text>
            <Text style={styles.bulletText}>
              • Mapping: To match your profile with relevant hospital vacancies
              based on specialty and location.
            </Text>
            <Text style={styles.bulletText}>
              • Payroll Administration: To process payments, calculate statutory
              tax deductions, and manage financial records.
            </Text>
            <Text style={styles.bulletText}>
              • Attendance Tracking: To confirm shift completion through
              geofencing and timestamped location data.
            </Text>
            <Text style={styles.bulletText}>
              • Communication: To send onboarding updates, shift notifications,
              and credentialing alerts.
            </Text>

            {/* SECTION 3 */}
            <Text style={styles.sectionTitle}>
              3. Data Sharing & Disclosure
            </Text>
            <Text style={styles.sectionIntro}>
              We do not sell your personal data. We share your information only
              in the following contexts:
            </Text>
            <Text style={styles.bulletText}>
              • With Hospital Partners: Sharing your professional profile
              (excluding sensitive financial data) with hospitals to facilitate
              a placement match.
            </Text>
            <Text style={styles.bulletText}>
              • Regulatory Compliance: When required by law or medical governing
              bodies to verify your license status.
            </Text>
            <Text style={styles.bulletText}>
              • Service Providers: With trusted third-party partners who assist
              in background verification, cloud hosting, and payroll processing
              under strict confidentiality agreements.
            </Text>

            {/* SECTION 4 */}
            <Text style={styles.sectionTitle}>4. Data Security</Text>
            <Text style={styles.sectionIntro}>
              We implement industry-standard technical measures to protect your
              data:
            </Text>
            <Text style={styles.bulletText}>
              • Encryption: Sensitive data, such as bank details and PII
              (Personally Identifiable Information), is encrypted both in
              transit and at rest.
            </Text>
            <Text style={styles.bulletText}>
              • Access Control: Access to personal data is restricted to
              authorized Healtrack.ai personnel on a "need-to-know" basis.
            </Text>

            {/* SECTION 5 */}
            <Text style={styles.sectionTitle}>5. Your Rights</Text>
            <Text style={styles.sectionIntro}>You have the right to:</Text>
            <Text style={styles.bulletText}>
              • Access & Rectify: Update your profile and professional
              information at any time via the Healtrack app.
            </Text>
            <Text style={styles.bulletText}>
              • Data Portability: Request a copy of the data we hold about you.
            </Text>
            <Text style={styles.bulletText}>
              • Account Deletion: Request the deletion of your account, subject
              to the retention of financial/tax records as required by law.
            </Text>

            {/* SECTION 6 */}
            <Text style={styles.sectionTitle}>
              6. Mobile Specifics & Permissions
            </Text>
            <Text style={styles.sectionIntro}>
              To utilize the full functionality of Healtrack, the mobile app may
              require permissions for:
            </Text>
            <Text style={styles.bulletText}>
              • Location: For shift verification and geofencing.
            </Text>
            <Text style={styles.bulletText}>
              • Camera/Gallery: To upload clear copies of your medical
              certifications.
            </Text>
            <Text style={styles.bulletText}>
              • Notifications: To receive real-time vacancy alerts and payroll
              confirmations.
            </Text>

            {/* SECTION 7 */}
            <Text style={styles.sectionTitle}>7. Updates to This Policy</Text>
            <Text style={styles.bulletText}>
              Healtrack.ai reserves the right to update this policy as our
              services evolve. Users will be notified of significant changes via
              the application or email.
            </Text>

            {/* Contact */}
            <View style={styles.declarationBox}>
              <Text style={styles.declarationTitle}>8. Contact Us</Text>
              <Text style={styles.declarationText}>
                For any privacy-related inquiries or to exercise your data
                rights, please contact:{'\n\n'}
                Privacy Officer, Healtrack{'\n'}
                Email: support@healtrackai.com{'\n'}
                Web: https://healtrackpro.ai
              </Text>
            </View>
          </ScrollView>

          {/* Footer Button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.agreeBtn} onPress={onClose}>
              <Text style={styles.agreeBtnText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default PrivacyPolicyModal;

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
    // Use fixed height instead of maxHeight so the sheet always fully renders
    height: SH * 0.88,
    paddingTop: scale(16),
  },
  handle: {
    width: scale(40),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: scale(14),
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
    flex: 1,
    paddingHorizontal: scale(20),
  },
  scrollContent: {
    paddingTop: scale(8),
    paddingBottom: scale(16),
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
  sectionIntro: {
    fontSize: scale(12),
    color: C.textSub,
    lineHeight: scale(19),
    marginBottom: scale(6),
    fontStyle: 'italic',
  },
  bulletText: {
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
  footer: {
    paddingHorizontal: scale(20),
    paddingTop: scale(14),
    paddingBottom: Platform.OS === 'ios' ? 36 : scale(24),
    borderTopWidth: 1,
    borderTopColor: '#eef6f7',
  },
  agreeBtn: {
    backgroundColor: C.primary,
    borderRadius: scale(12),
    paddingVertical: scale(14),
    alignItems: 'center',
  },
  agreeBtnText: {
    color: C.white,
    fontSize: scale(15),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
