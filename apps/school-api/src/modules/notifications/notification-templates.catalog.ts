import { Language } from '../users/entities/user.entity';
import { NotificationCategory } from './entities/notification.entity';
import { SmsMode } from './entities/notification-template.entity';

export const TEMPLATES = {
  SYSTEM_TEST: 'SYSTEM_TEST',
  ACCOUNT_INVITE: 'ACCOUNT_INVITE',
  STUDENT_ABSENT: 'STUDENT_ABSENT',
  LEAVE_STATUS: 'LEAVE_STATUS',
  BUS_STARTED: 'BUS_STARTED',
  BUS_APPROACHING: 'BUS_APPROACHING',
  BUS_ARRIVED: 'BUS_ARRIVED',
  STUDENT_BOARDED: 'STUDENT_BOARDED',
  STUDENT_ALIGHTED: 'STUDENT_ALIGHTED',
  SOS_ALERT: 'SOS_ALERT',
  DIARY_POSTED: 'DIARY_POSTED',
  MEETING_REMINDER: 'MEETING_REMINDER',
  CHAT_MESSAGE: 'CHAT_MESSAGE',
  STAFF_LEAVE_STATUS: 'STAFF_LEAVE_STATUS',
  LEAVE_APPROVAL_NEEDED: 'LEAVE_APPROVAL_NEEDED',
  SUBSTITUTE_ASSIGNED: 'SUBSTITUTE_ASSIGNED',
  PAYSLIP_READY: 'PAYSLIP_READY',
  FLEET_DOCUMENT_EXPIRY: 'FLEET_DOCUMENT_EXPIRY',
  TRIP_NOT_BOARDED: 'TRIP_NOT_BOARDED',
} as const;

interface TemplateText {
  title: string;
  body: string;
  sms_body: string | null;
}

export interface TemplateDefinition {
  code: string;
  category: NotificationCategory;
  push: boolean;
  sms: SmsMode;
  critical: boolean;
  text: Record<Language, TemplateText>;
}

export const TEMPLATE_CATALOG: TemplateDefinition[] = [
  {
    code: TEMPLATES.SYSTEM_TEST,
    category: 'system',
    push: true,
    sms: 'fallback',
    critical: false,
    text: {
      en: {
        title: 'Test notification',
        body: 'Hello {{name}}, this is a test message from {{school}}. Notifications are working.',
        sms_body: 'Dear {{name}}, this is a test message from {{school}}. -TAMILZOROUS',
      },
      ta: {
        title: 'சோதனை அறிவிப்பு',
        body: 'வணக்கம் {{name}}, இது {{school}} அனுப்பிய சோதனைச் செய்தி. அறிவிப்புகள் சரியாக வேலை செய்கின்றன.',
        sms_body: 'அன்புள்ள {{name}}, இது {{school}} அனுப்பிய சோதனைச் செய்தி. -TAMILZOROUS',
      },
    },
  },
  {
    code: TEMPLATES.ACCOUNT_INVITE,
    category: 'account',
    push: false,
    sms: 'always',
    critical: false,
    text: {
      en: {
        title: 'Welcome to {{school}}',
        body: 'Hi {{name}}, your {{app}} account is ready. Install the app and sign in with this mobile number.',
        sms_body:
          'Dear {{name}}, your {{school}} {{app}} account is ready. Install the app and sign in with this mobile number. -TAMILZOROUS',
      },
      ta: {
        title: '{{school}}-க்கு வரவேற்கிறோம்',
        body: 'வணக்கம் {{name}}, உங்கள் {{app}} கணக்கு தயார். செயலியை நிறுவி இந்த மொபைல் எண்ணுடன் உள்நுழையவும்.',
        sms_body:
          'அன்புள்ள {{name}}, உங்கள் {{school}} {{app}} கணக்கு தயார். செயலியை நிறுவி இந்த மொபைல் எண்ணுடன் உள்நுழையவும். -TAMILZOROUS',
      },
    },
  },
  {
    code: TEMPLATES.STUDENT_ABSENT,
    category: 'attendance',
    push: true,
    sms: 'fallback',
    critical: true,
    text: {
      en: {
        title: '{{student}} is absent today',
        body: '{{student}} ({{class}}) was marked absent on {{date}}. Contact the class teacher if this is not correct.',
        sms_body: 'Dear parent, {{student}} ({{class}}) was marked absent on {{date}}. -TAMILZOROUS',
      },
      ta: {
        title: '{{student}} இன்று வருகை தரவில்லை',
        body: '{{student}} ({{class}}) {{date}} அன்று வருகை இல்லை எனக் குறிக்கப்பட்டுள்ளார். இது தவறு எனில் வகுப்பு ஆசிரியரைத் தொடர்பு கொள்ளவும்.',
        sms_body:
          'அன்புள்ள பெற்றோரே, {{student}} ({{class}}) {{date}} அன்று வருகை இல்லை எனக் குறிக்கப்பட்டுள்ளார். -TAMILZOROUS',
      },
    },
  },
  {
    code: TEMPLATES.LEAVE_STATUS,
    category: 'attendance',
    push: true,
    sms: 'never',
    critical: false,
    text: {
      en: {
        title: 'Leave request {{status}}',
        body: 'The leave request for {{student}} from {{from}} to {{to}} was {{status}}.',
        sms_body: null,
      },
      ta: {
        title: 'விடுப்பு கோரிக்கை {{status}}',
        body: '{{student}}-க்கான {{from}} முதல் {{to}} வரையிலான விடுப்பு கோரிக்கை {{status}}.',
        sms_body: null,
      },
    },
  },
  {
    code: TEMPLATES.STAFF_LEAVE_STATUS,
    category: 'attendance',
    push: true,
    sms: 'never',
    critical: false,
    text: {
      en: {
        title: 'Your leave is {{status}}',
        body: 'Your {{type}} from {{from}} to {{to}} ({{days}} days) is {{status}}.{{note}}',
        sms_body: null,
      },
      ta: {
        title: 'உங்கள் விடுப்பு {{status}}',
        body: '{{from}} முதல் {{to}} வரையிலான உங்கள் {{type}} ({{days}} நாட்கள்) {{status}}.{{note}}',
        sms_body: null,
      },
    },
  },
  {
    code: TEMPLATES.LEAVE_APPROVAL_NEEDED,
    category: 'attendance',
    push: true,
    sms: 'never',
    critical: false,
    text: {
      en: {
        title: 'Leave waiting for you',
        body: '{{name}} applied for {{type}} from {{from}} to {{to}} ({{days}} days).',
        sms_body: null,
      },
      ta: {
        title: 'உங்கள் ஒப்புதலுக்கு விடுப்பு',
        body: '{{name}} {{from}} முதல் {{to}} வரை {{type}} ({{days}} நாட்கள்) கோரியுள்ளார்.',
        sms_body: null,
      },
    },
  },
  {
    code: TEMPLATES.BUS_STARTED,
    category: 'transport',
    push: true,
    sms: 'never',
    critical: false,
    text: {
      en: {
        title: 'Bus has started',
        body: '{{bus}} has started the {{trip}} trip. Track it live in the app.',
        sms_body: null,
      },
      ta: {
        title: 'பேருந்து புறப்பட்டது',
        body: '{{bus}} {{trip}} பயணத்தைத் தொடங்கியது. செயலியில் நேரலையில் பார்க்கவும்.',
        sms_body: null,
      },
    },
  },
  {
    code: TEMPLATES.BUS_APPROACHING,
    category: 'transport',
    push: true,
    sms: 'fallback',
    critical: true,
    text: {
      en: {
        title: 'Bus is {{minutes}} min away',
        body: '{{bus}} will reach {{stop}} in about {{minutes}} minutes.',
        sms_body: '{{bus}} will reach {{stop}} in about {{minutes}} minutes. -TAMILZOROUS',
      },
      ta: {
        title: 'பேருந்து {{minutes}} நிமிடத்தில் வரும்',
        body: '{{bus}} சுமார் {{minutes}} நிமிடங்களில் {{stop}} வந்தடையும்.',
        sms_body: '{{bus}} சுமார் {{minutes}} நிமிடங்களில் {{stop}} வந்தடையும். -TAMILZOROUS',
      },
    },
  },
  {
    code: TEMPLATES.BUS_ARRIVED,
    category: 'transport',
    push: true,
    sms: 'never',
    critical: false,
    text: {
      en: { title: 'Bus reached {{place}}', body: '{{bus}} reached {{place}} at {{time}}.', sms_body: null },
      ta: {
        title: 'பேருந்து {{place}} வந்தடைந்தது',
        body: '{{bus}} {{time}} மணிக்கு {{place}} வந்தடைந்தது.',
        sms_body: null,
      },
    },
  },
  {
    code: TEMPLATES.STUDENT_BOARDED,
    category: 'transport',
    push: true,
    sms: 'never',
    critical: false,
    text: {
      en: {
        title: '{{student}} boarded the bus',
        body: '{{student}} boarded {{bus}} at {{stop}} at {{time}}.',
        sms_body: null,
      },
      ta: {
        title: '{{student}} பேருந்தில் ஏறினார்',
        body: '{{student}} {{time}} மணிக்கு {{stop}}-இல் {{bus}}-இல் ஏறினார்.',
        sms_body: null,
      },
    },
  },
  {
    code: TEMPLATES.STUDENT_ALIGHTED,
    category: 'transport',
    push: true,
    sms: 'never',
    critical: false,
    text: {
      en: {
        title: '{{student}} got off the bus',
        body: '{{student}} got off {{bus}} at {{stop}} at {{time}}.',
        sms_body: null,
      },
      ta: {
        title: '{{student}} பேருந்திலிருந்து இறங்கினார்',
        body: '{{student}} {{time}} மணிக்கு {{stop}}-இல் {{bus}}-இலிருந்து இறங்கினார்.',
        sms_body: null,
      },
    },
  },
  {
    code: TEMPLATES.SOS_ALERT,
    category: 'alert',
    push: true,
    sms: 'always',
    critical: true,
    text: {
      en: {
        title: 'SOS from {{bus}}',
        body: '{{reporter}} raised an SOS on {{bus}} near {{location}} at {{time}}. Call {{phone}}.',
        sms_body:
          'SOS: {{reporter}} raised an alert on {{bus}} near {{location}} at {{time}}. Call {{phone}}. -TAMILZOROUS',
      },
      ta: {
        title: '{{bus}}-இலிருந்து அவசர அழைப்பு',
        body: '{{reporter}} {{time}} மணிக்கு {{location}} அருகே {{bus}}-இல் அவசர அழைப்பு விடுத்துள்ளார். {{phone}} எண்ணை அழைக்கவும்.',
        sms_body:
          'அவசரம்: {{reporter}} {{time}} மணிக்கு {{location}} அருகே {{bus}}-இல் அவசர அழைப்பு. {{phone}} எண்ணை அழைக்கவும். -TAMILZOROUS',
      },
    },
  },
  {
    code: TEMPLATES.DIARY_POSTED,
    category: 'diary',
    push: true,
    sms: 'never',
    critical: false,
    text: {
      en: {
        title: 'New {{type}} for {{student}}',
        body: '{{teacher}} posted {{type}} in {{subject}}: {{title}}',
        sms_body: null,
      },
      ta: {
        title: '{{student}}-க்கு புதிய {{type}}',
        body: '{{teacher}} {{subject}} பாடத்தில் {{type}} பதிவிட்டுள்ளார்: {{title}}',
        sms_body: null,
      },
    },
  },
  {
    code: TEMPLATES.MEETING_REMINDER,
    category: 'meeting',
    push: true,
    sms: 'fallback',
    critical: false,
    text: {
      en: {
        title: 'Meeting at {{time}}',
        body: 'Your meeting with {{host}} about {{student}} starts at {{time}}. Open the app to join.',
        sms_body:
          'Reminder: your meeting with {{host}} about {{student}} starts at {{time}}. Join from the app. -TAMILZOROUS',
      },
      ta: {
        title: '{{time}} மணிக்குக் கூட்டம்',
        body: '{{student}} குறித்து {{host}} உடனான உங்கள் கூட்டம் {{time}} மணிக்குத் தொடங்கும். இணைய செயலியைத் திறக்கவும்.',
        sms_body:
          'நினைவூட்டல்: {{student}} குறித்து {{host}} உடனான கூட்டம் {{time}} மணிக்குத் தொடங்கும். செயலியில் இணையவும். -TAMILZOROUS',
      },
    },
  },
  {
    code: TEMPLATES.CHAT_MESSAGE,
    category: 'chat',
    push: true,
    sms: 'never',
    critical: false,
    text: {
      en: { title: '{{sender}}', body: '{{preview}}', sms_body: null },
      ta: { title: '{{sender}}', body: '{{preview}}', sms_body: null },
    },
  },
  {
    code: TEMPLATES.SUBSTITUTE_ASSIGNED,
    category: 'attendance',
    push: true,
    sms: 'fallback',
    critical: false,
    text: {
      en: {
        title: 'Substitute class: {{section}}, period {{period}}',
        body: 'Please take {{subject}} for {{section}} in period {{period}} ({{time}}) on {{date}}, in place of {{absent}}.{{room}}',
        sms_body: 'Substitute: {{section}} period {{period}} ({{time}}) on {{date}} for {{absent}}. - {{school}}',
      },
      ta: {
        title: 'மாற்று வகுப்பு: {{section}}, பாடவேளை {{period}}',
        body: '{{date}} அன்று {{period}} ஆம் பாடவேளையில் ({{time}}) {{absent}} அவர்களுக்குப் பதிலாக {{section}} வகுப்பில் {{subject}} எடுக்கவும்.{{room}}',
        sms_body: 'மாற்று வகுப்பு: {{section}} பாடவேளை {{period}} ({{time}}) {{date}}, {{absent}} பதிலாக. - {{school}}',
      },
    },
  },
  {
    code: TEMPLATES.PAYSLIP_READY,
    category: 'account',
    push: true,
    sms: 'never',
    critical: false,
    text: {
      en: {
        title: 'Payslip for {{month}} is ready',
        body: 'Your payslip for {{month}} is ready. Net pay {{net}}. Open the app to download it.',
        sms_body: null,
      },
      ta: {
        title: '{{month}} சம்பளச் சீட்டு தயார்',
        body: '{{month}} மாதத்திற்கான உங்கள் சம்பளச் சீட்டு தயார். நிகர ஊதியம் {{net}}. பதிவிறக்க ஆப்பைத் திறக்கவும்.',
        sms_body: null,
      },
    },
  },
  {
    code: TEMPLATES.FLEET_DOCUMENT_EXPIRY,
    category: 'transport',
    push: true,
    sms: 'never',
    critical: false,
    text: {
      en: {
        title: '{{document}} ends on {{date}}: {{subject}}',
        body: '{{document}} for {{subject}} is valid till {{date}} ({{days}} days left). Renew it to keep the bus on the road.',
        sms_body: null,
      },
      ta: {
        title: '{{document}} {{date}} அன்று முடிகிறது: {{subject}}',
        body: '{{subject}} க்கான {{document}} {{date}} வரை மட்டுமே செல்லும் ({{days}} நாட்கள் உள்ளன). பேருந்து இயங்க புதுப்பிக்கவும்.',
        sms_body: null,
      },
    },
  },
  {
    code: TEMPLATES.TRIP_NOT_BOARDED,
    category: 'transport',
    push: true,
    sms: 'never',
    critical: false,
    text: {
      en: {
        title: '{{count}} from {{section}} did not board the bus',
        body: 'Not on {{bus}} this morning: {{names}}. Please check before the first period.',
        sms_body: null,
      },
      ta: {
        title: '{{section}} வகுப்பில் {{count}} பேர் பேருந்தில் ஏறவில்லை',
        body: 'இன்று காலை {{bus}} பேருந்தில் இல்லை: {{names}}. முதல் பாடவேளைக்கு முன் சரிபார்க்கவும்.',
        sms_body: null,
      },
    },
  },
];
