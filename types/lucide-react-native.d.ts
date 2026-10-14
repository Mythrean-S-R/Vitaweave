/**
 * TypeScript shim for lucide-react-native.
 * The upstream barrel export exceeds TS named-export limits in some versions.
 */
declare module 'lucide-react-native' {
  import type { ForwardRefExoticComponent } from 'react';
  import type { ColorValue } from 'react-native';
  import type { SvgProps } from 'react-native-svg';

  export type LucideIcon = ForwardRefExoticComponent<
    SvgProps & { size?: number | string; color?: ColorValue }
  >;

  export const Activity: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const Ambulance: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const Award: LucideIcon;
  export const BarChart2: LucideIcon;
  export const Bell: LucideIcon;
  export const BellDot: LucideIcon;
  export const Bot: LucideIcon;
  export const BotMessageSquare: LucideIcon;
  export const BriefcaseMedical: LucideIcon;
  export const Calendar: LucideIcon;
  export const CalendarClock: LucideIcon;
  export const Camera: LucideIcon;
  export const CheckCircle: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const Chrome: LucideIcon;
  export const Clock: LucideIcon;
  export const Droplets: LucideIcon;
  export const Edit2: LucideIcon;
  export const FileText: LucideIcon;
  export const Filter: LucideIcon;
  export const FolderOpen: LucideIcon;
  export const Globe: LucideIcon;
  export const Hash: LucideIcon;
  export const Heart: LucideIcon;
  export const House: LucideIcon;
  export const Image: LucideIcon;
  export const Key: LucideIcon;
  export const Languages: LucideIcon;
  export const LayoutDashboard: LucideIcon;
  export const Lightbulb: LucideIcon;
  export const Lock: LucideIcon;
  export const LogOut: LucideIcon;
  export const Mail: LucideIcon;
  export const MapPin: LucideIcon;
  export const Megaphone: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const Mic: LucideIcon;
  export const MicOff: LucideIcon;
  export const Minus: LucideIcon;
  export const Moon: LucideIcon;
  export const Phone: LucideIcon;
  export const PhoneOff: LucideIcon;
  export const Pill: LucideIcon;
  export const Plus: LucideIcon;
  export const Printer: LucideIcon;
  export const Radio: LucideIcon;
  export const RadioTower: LucideIcon;
  export const Search: LucideIcon;
  export const Send: LucideIcon;
  export const Settings: LucideIcon;
  export const Settings2: LucideIcon;
  export const Shield: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const Sparkles: LucideIcon;
  export const Stethoscope: LucideIcon;
  export const Syringe: LucideIcon;
  export const Thermometer: LucideIcon;
  export const TrendingDown: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const TriangleAlert: LucideIcon;
  export const User: LucideIcon;
  export const UserPlus: LucideIcon;
  export const UserRound: LucideIcon;
  export const Users: LucideIcon;
  export const UsersRound: LucideIcon;
  export const Video: LucideIcon;
  export const VideoOff: LucideIcon;
  export const Wifi: LucideIcon;
  export const WifiOff: LucideIcon;
  export const X: LucideIcon;
  export const Zap: LucideIcon;
}
