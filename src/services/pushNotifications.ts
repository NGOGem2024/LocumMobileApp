import {
  OneSignal,
  LogLevel,
  NotificationClickEvent,
} from 'react-native-onesignal';
import { createNavigationContainerRef } from '@react-navigation/native';

const ONESIGNAL_APP_ID = 'b8d48674-8580-4d66-ba76-bccc63796455';

export const navigationRef = createNavigationContainerRef<any>();

let pendingRoute: { name: string; params?: any } | null = null;
let canNavigate = false; // true only when the logged-in stack is mounted

const tryNavigate = () => {
  if (pendingRoute && canNavigate && navigationRef.isReady()) {
    navigationRef.navigate(pendingRoute.name, pendingRoute.params);
    pendingRoute = null;
  }
};

// Called from AppNavigator whenever auth/splash state changes
export const setPushNavigationReady = (ready: boolean) => {
  canNavigate = ready;
  tryNavigate();
};

export const flushPendingNavigation = tryNavigate;

const navigateSafely = (name: string, params?: any) => {
  pendingRoute = { name, params };
  tryNavigate(); // runs immediately if ready, otherwise waits
};

// Default DutiesScreen tab for each push type
const TYPE_TO_TAB: Record<string, string> = {
  STAFFING_INVITATION: 'Invited',
  STAFFING_ASSIGNMENT: 'Assigned',
  ATTENDANCE_REVIEW: 'Past',
  DUTY_REMINDER: 'Today',
  MISSED_CHECKOUT: 'Today',
};

export const initOneSignal = () => {
  if (__DEV__) OneSignal.Debug.setLogLevel(LogLevel.Verbose);
  OneSignal.initialize(ONESIGNAL_APP_ID);

  OneSignal.Notifications.addEventListener(
    'click',
    (event: NotificationClickEvent) => {
      const data: any = event.notification.additionalData;
      const type: string | undefined = data?.type;
      // Server can send `tab`; otherwise fall back to the default tab for the type.
      const tab: string | undefined = data?.tab || (type ? TYPE_TO_TAB[type] : undefined);
      if (type && tab) {
        navigateSafely('DutiesScreen', {
          defaultTab: tab,
          requirementId: data.requirement_id,
          invitationId: data.invitation_id,
          pushTs: Date.now(), // forces DutiesScreen to re-apply the tab on every tap
        });
      }
    },
  );
};

export const pushLogin = (doctorId: string) => {
  OneSignal.login(String(doctorId));
  OneSignal.Notifications.requestPermission(true);
};

export const pushLogout = () => {
  OneSignal.logout();
};