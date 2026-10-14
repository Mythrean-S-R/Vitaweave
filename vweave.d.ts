declare module 'lucide-react-native' {
    import { FC } from 'react';
    import { SvgProps } from 'react-native-svg';
    export interface IconProps extends SvgProps {
        size?: number | string;
        color?: string;
        stroke?: string;
        strokeWidth?: number | string;
        absoluteStrokeWidth?: boolean;
    }
    export type Icon = FC<IconProps>;
    export const Phone: Icon;
    export const Lock: Icon;
    export const ChevronRight: Icon;
    // Add more as needed or use a wildcard if preferred, 
    // but listing them specifically is safer for immediate resolution.
}
