import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

type CoreItem = {
  icon: string;
  title: string;
  description: string;
  source: string;
};

type ImpactItem = {
  icon: string;
  title: string;
  description: string;
};

@Component({
  selector: 'app-home-page',
  imports: [CommonModule, MatIconModule],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
  standalone: true,
})
export class LandingHomePageComponent {
  hero = {
    badge: 'National Digital Governance Initiative',
    title: 'InfoBhoomi: The Foundation for Digitized Land Governance in Sri Lanka',
    subtitle:
      'A self-updating localized Spatial Data Infrastructure (SDI) designed to unify land administration, utility, and planning data, enabling real-time data sharing and efficient local-level decision-making.',
  };

  challengeList = [
    'Fragmented data across multiple agencies',
    'Inconsistent formats and standards',
    'Delayed decision-making processes',
    'Limited data accessibility for stakeholders',
    'Redundant data collection efforts',
  ];

  solutionList = [
    'Unified spatial data infrastructure',
    'ISO 19152 (LADM) compliance',
    'Real-time data synchronization',
    'OGC standards for interoperability',
    'Self-updating local SDI platform',
  ];

  coreFunctions: CoreItem[] = [
    {
      icon: 'location_on',
      title: 'Land Administration Data',
      description: 'Integrated cadastral data from Survey Department and Land Registry',
      source: 'Survey Department / Land Registry',
    },
    {
      icon: 'description',
      title: 'Planning & Valuation',
      description: 'Zoning regulations and property valuation information',
      source: 'UDA Badulla / Valuation Dept',
    },
    {
      icon: 'bolt',
      title: 'Utility Networks',
      description: 'Comprehensive utility infrastructure mapping',
      source: 'CEB, Water Board, RDA, Telecom',
    },
    {
      icon: 'storage',
      title: 'Technical Architecture',
      description: 'Built on ISO 19152 (LADM) and OGC standards',
      source: 'PostgreSQL / PostGIS',
    },
    {
      icon: 'public',
      title: 'Spatial Data Infrastructure',
      description: 'Self-updating localized SDI platform',
      source: 'GeoServer / OpenLayers',
    },
    {
      icon: 'my_location',
      title: 'Decision Support System',
      description: 'Real-time analytics and reporting tools',
      source: 'InfoBhoomi Analytics Engine',
    },
  ];

  impacts: ImpactItem[] = [
    {
      icon: 'security',
      title: 'Enhanced Land Tenure Security',
      description: 'Reliable digital records protecting property rights',
    },
    {
      icon: 'balance',
      title: 'Transparent Land Governance',
      description: 'Open access to land information and decision processes',
    },
    {
      icon: 'apartment',
      title: 'Efficient Planning & Regulation',
      description: 'Data-driven urban planning and zoning decisions',
    },
    {
      icon: 'description',
      title: 'Methodical Taxation',
      description: 'Accurate property valuation for fair taxation',
    },
    {
      icon: 'trending_up',
      title: 'Economic Development',
      description: 'Foundation for investment and sustainable growth',
    },
  ];

  sustainability = [
    'Operations & Maintenance (O&M) protocols',
    'Comprehensive capacity building programs',
    'Technical training for local authorities',
  ];

  nodes = [
    { label: 'Land', color: 'land-green' },
    { label: 'Utilities', color: 'water-blue' },
    { label: 'Planning', color: 'primary' },
    { label: 'Valuation', color: 'accent' },
    { label: 'NSDI', color: 'secondary' },
  ];

  heroMap = 'sl.webp';
  circuitBoard = 'cc.jpg';
}
