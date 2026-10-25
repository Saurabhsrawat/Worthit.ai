/**
 * WorthIt AI - Review Taxonomy for Laptops and Smartphones
 * Defines consistent categorizations for aspects and common hardware/software issue patterns.
 */

import { ProductCategory } from '../types';

export interface AspectDefinition {
  id: string;
  name: string;
  description: string;
  commonIssues: string[];
}

export const LAPTOP_ASPECTS: AspectDefinition[] = [
  {
    id: 'battery',
    name: 'Battery Life & Charging',
    description: 'Real-world screen-on endurance, standby drain, and charger portability.',
    commonIssues: ['Rapid battery degradation', 'Charger overheating', 'Low unplugged battery life'],
  },
  {
    id: 'thermal',
    name: 'Thermal & Fan Noise',
    description: 'Chassis heat, fan whining under load, thermal throttling.',
    commonIssues: ['Excessive keyboard heat', 'Aggressive fan noise in quiet rooms', 'CPU thermal throttling'],
  },
  {
    id: 'performance',
    name: 'Performance & Multitasking',
    description: 'Boot times, developer compile speeds, browser tab memory pressure.',
    commonIssues: ['8GB unified RAM bottleneck', 'Slow read/write on base SSD', 'Stuttering under heavy load'],
  },
  {
    id: 'display',
    name: 'Display & Brightness',
    description: 'Outdoor visibility in Indian daylight, color accuracy, backlight bleed.',
    commonIssues: ['Low 250 nits brightness outdoors', 'Noticeable IPS backlight bleed', 'Reflective glossy finish'],
  },
  {
    id: 'build_quality',
    name: 'Build Quality & Hinges',
    description: 'Flex in keyboard deck, long-term hinge resistance, chassis materials.',
    commonIssues: ['Cracking screen hinges', 'Creaking plastic chassis', 'Loose trackpad rattle'],
  },
  {
    id: 'keyboard',
    name: 'Keyboard & Trackpad',
    description: 'Key travel, typing comfort for coding/typing, palm rejection.',
    commonIssues: ['Shallow key travel', 'Erratic palm rejection', 'Keys sticking over time'],
  },
  {
    id: 'connectivity',
    name: 'Connectivity & Ports',
    description: 'Wi-Fi 6 stability, USB-C charging support, port dongle dependency.',
    commonIssues: ['No USB-A ports without dongles', 'Wi-Fi drops on sleep wake', 'Lack of full-speed HDMI'],
  },
  {
    id: 'software',
    name: 'Software, OS & Drivers',
    description: 'Pre-installed bloatware, sleep power draw, BIOS updates.',
    commonIssues: ['Pre-installed McAfee trial popups', 'Modern Standby sleep battery drain', 'Audio driver crackle'],
  },
  {
    id: 'support',
    name: 'Service Center & Warranty in India',
    description: 'Turnaround time at authorized service centers across Tier-1/2 Indian cities.',
    commonIssues: ['Delay in spare motherboard import', 'Service center claim disputes', 'Short 1-year coverage'],
  },
  {
    id: 'durability',
    name: 'Long-term Durability',
    description: 'Condition after 18–36 months of daily use in Indian tropical environments.',
    commonIssues: ['Rubber feet peeling', 'Dust ingress clogging heatsinks', 'Coating wear around palmrest'],
  },
];

export const SMARTPHONE_ASPECTS: AspectDefinition[] = [
  {
    id: 'battery',
    name: 'Battery Life & Endurance',
    description: 'All-day 5G battery life, idle battery drain, fast-charging heat.',
    commonIssues: ['Overheating during 67W+ fast charging', 'Sub-5hr SOT on 5G', 'Idle overnight drain'],
  },
  {
    id: 'camera',
    name: 'Camera & Optics',
    description: 'Low-light indoor performance, shutter lag on moving subjects, OIS stability.',
    commonIssues: ['Over-sharpened human skin tones', 'Shutter lag in low light', 'Lens fogging under humidity'],
  },
  {
    id: 'thermal',
    name: 'Performance & Gaming Heat',
    description: 'Thermal management in BGMI/Genshin, sustained frame rates.',
    commonIssues: ['Framerate drops after 15 min gaming', 'Phone gets hot around camera module'],
  },
  {
    id: 'display',
    name: 'Display & AMOLED Longevity',
    description: 'HDR peak brightness in Indian sun, green line hardware defect risk.',
    commonIssues: ['Green/pink line defect after OTA update', 'Black crush in dark video scenes'],
  },
  {
    id: 'software',
    name: 'Software, UI & Updates',
    description: 'Clean UI vs bloatware/ads in India ROM, promptness of Android/iOS updates.',
    commonIssues: ['Glance lockscreen spam', 'Aggressive RAM management killing apps', 'Delayed regional updates'],
  },
  {
    id: 'build_quality',
    name: 'Build Quality & Drop Resistance',
    description: 'Back glass fragility, IP rating against monsoon rains, frame durability.',
    commonIssues: ['Fragile rear glass back', 'No official IP rating for water resistance'],
  },
  {
    id: 'network',
    name: 'Network, 5G & Reception',
    description: 'Jio/Airtel 5G band support, e-SIM convenience, microphone noise cancelling in Indian traffic.',
    commonIssues: ['Weak 5G carrier aggregation', 'Call mic picking up ambient traffic noise'],
  },
  {
    id: 'support',
    name: 'Customer Support in India',
    description: 'Brand service center responsiveness and official parts availability.',
    commonIssues: ['High cost of out-of-warranty AMOLED display replacement', 'Part wait times'],
  },
];

export function getAspectTaxonomy(category: ProductCategory): AspectDefinition[] {
  return category === 'laptop' ? LAPTOP_ASPECTS : SMARTPHONE_ASPECTS;
}
