export interface QueryParam {
  key: string;
  label: string;
  type: 'number' | 'text' | 'select';
  default?: number | string;
  unit?: string;
  options?: string[];
}

export interface QueryDef {
  id: string;
  name: string;
  description: string;
  params: QueryParam[];
  sql: (p: Record<string, any>) => string;
}

export interface QueryCategory {
  label: string;
  icon: string;
  color: string;
  queries: QueryDef[];
}

export const QUERY_CATEGORIES: Record<string, QueryCategory> = {
  disaster: {
    label: 'Disaster & Risk',
    icon: 'warning',
    color: '#e74c3c',
    queries: [
      {
        id: 'flood_elev',
        name: 'Flood Risk by Elevation',
        description: 'Highlight parcels below a given elevation threshold',
        params: [
          { key: 'elevation', label: 'Max Elevation (m)', type: 'number', default: 5, unit: 'm' },
          {
            key: 'zone',
            label: 'Zone',
            type: 'select',
            options: [
              'All Wards',
              'Ward 1 - Fort',
              'Ward 2 - Pettah',
              'Ward 3 - Maradana',
              'Ward 4 - Slave Island',
              'Ward 5 - Kollupitiya',
            ],
          },
        ],
        sql: (p) =>
          `SELECT * FROM land_parcels\nWHERE elevation < ${p['elevation']}\n  AND zone = '${p['zone']}';`,
      },
      {
        id: 'river_buffer',
        name: 'River Proximity Analysis',
        description: 'Find parcels within buffer distance of rivers/canals',
        params: [
          { key: 'buffer', label: 'Buffer Distance', type: 'number', default: 100, unit: 'm' },
          {
            key: 'river',
            label: 'Water Body',
            type: 'select',
            options: [
              'All Rivers',
              'Kelani River',
              'Beira Lake',
              'Diyawanna Oya',
              'San Sebastian Canal',
            ],
          },
        ],
        sql: (p) =>
          `SELECT p.* FROM land_parcels p\nJOIN water_bodies w ON\n  ST_DWithin(p.geom, w.geom, ${p['buffer']})\nWHERE w.name = '${p['river']}';`,
      },
      {
        id: 'landslide_slope',
        name: 'Landslide Susceptibility',
        description: 'Identify parcels on steep slopes with risk factors',
        params: [
          { key: 'slope', label: 'Min Slope', type: 'number', default: 30, unit: '\u00B0' },
          {
            key: 'soil',
            label: 'Soil Type',
            type: 'select',
            options: [
              'All Types',
              'Laterite',
              'Red-Yellow Podzolic',
              'Alluvial',
              'Bog & Half-Bog',
            ],
          },
        ],
        sql: (p) =>
          `SELECT p.* FROM land_parcels p\nJOIN slope_data s ON ST_Intersects(p.geom, s.geom)\nJOIN soil_map sm ON ST_Intersects(p.geom, sm.geom)\nWHERE s.gradient > ${p['slope']}\n  AND sm.soil_type = '${p['soil']}';`,
      },
      {
        id: 'coastal_zone',
        name: 'Coastal Reservation Violations',
        description: 'Structures within the coastal buffer zone',
        params: [
          { key: 'buffer', label: 'Coastal Buffer', type: 'number', default: 100, unit: 'm' },
        ],
        sql: (p) =>
          `SELECT b.* FROM buildings b\nJOIN coastline c ON\n  ST_DWithin(b.geom, c.geom, ${p['buffer']})\nWHERE b.permit_status != 'Approved';`,
      },
    ],
  },
  land: {
    label: 'Land & Property',
    icon: 'domain',
    color: '#2ecc71',
    queries: [
      {
        id: 'parcel_search',
        name: 'Parcel Search',
        description: 'Search by owner, deed, or assessment number',
        params: [
          {
            key: 'search_by',
            label: 'Search By',
            type: 'select',
            options: ['Owner Name', 'Deed Number', 'Assessment No', 'Survey Plan No'],
          },
          { key: 'value', label: 'Search Value', type: 'text', default: '' },
        ],
        sql: (p) => {
          const col =
            p['search_by'] === 'Owner Name'
              ? 'owner_name'
              : p['search_by'] === 'Deed Number'
                ? 'deed_no'
                : p['search_by'] === 'Assessment No'
                  ? 'assessment_no'
                  : 'survey_plan_no';
          return `SELECT * FROM land_parcels\nWHERE ${col}\n  ILIKE '%${p['value']}%';`;
        },
      },
      {
        id: 'gov_land',
        name: 'Government Land Parcels',
        description: 'Identify all state-owned land within boundary',
        params: [
          {
            key: 'zone',
            label: 'GN Division',
            type: 'select',
            options: ['All Divisions', 'Colombo', 'Dehiwala', 'Moratuwa', 'Kotte', 'Maharagama'],
          },
        ],
        sql: (p) =>
          `SELECT * FROM land_parcels\nWHERE ownership_type = 'Government'\n  AND gn_division = '${p['zone']}';`,
      },
      {
        id: 'land_use',
        name: 'Land Use Classification',
        description: 'Query parcels by current land use type',
        params: [
          {
            key: 'use_type',
            label: 'Land Use',
            type: 'select',
            options: [
              'Residential',
              'Commercial',
              'Industrial',
              'Agricultural',
              'Mixed Use',
              'Vacant',
            ],
          },
          {
            key: 'min_area',
            label: 'Min Area (perches)',
            type: 'number',
            default: 0,
            unit: 'perch',
          },
        ],
        sql: (p) =>
          `SELECT * FROM land_parcels\nWHERE land_use = '${p['use_type']}'\n  AND area_perches >= ${p['min_area']};`,
      },
      {
        id: 'vacant_land',
        name: 'Vacant / Undeveloped Land',
        description: 'Find undeveloped parcels above minimum area',
        params: [
          {
            key: 'min_area',
            label: 'Min Area (perches)',
            type: 'number',
            default: 10,
            unit: 'perch',
          },
          {
            key: 'zone',
            label: 'Zone',
            type: 'select',
            options: ['All Zones', 'Residential', 'Commercial', 'Mixed'],
          },
        ],
        sql: (p) =>
          `SELECT * FROM land_parcels\nWHERE land_use = 'Vacant'\n  AND area_perches >= ${p['min_area']}\n  AND zoning = '${p['zone']}';`,
      },
    ],
  },
  planning: {
    label: 'Urban Planning',
    icon: 'location_city',
    color: '#3498db',
    queries: [
      {
        id: 'zoning_check',
        name: 'Zoning Compliance Check',
        description: 'Verify if land use conforms to zoning regulations',
        params: [
          {
            key: 'zone_type',
            label: 'Expected Zone',
            type: 'select',
            options: ['Residential', 'Commercial', 'Industrial', 'Conservation', 'Mixed Use'],
          },
        ],
        sql: (p) =>
          `SELECT * FROM land_parcels\nWHERE zoning = '${p['zone_type']}'\n  AND land_use != zoning;`,
      },
      {
        id: 'road_widening',
        name: 'Road Widening Impact',
        description: 'Parcels affected by proposed road widening',
        params: [
          { key: 'road', label: 'Road Name', type: 'text', default: '' },
          {
            key: 'width',
            label: 'Widening Distance',
            type: 'number',
            default: 5,
            unit: 'm',
          },
        ],
        sql: (p) =>
          `SELECT p.* FROM land_parcels p\nJOIN road_centerlines r ON\n  ST_DWithin(p.geom, r.geom, ${p['width']})\nWHERE r.road_name ILIKE '%${p['road']}%';`,
      },
      {
        id: 'far_violation',
        name: 'FAR / Coverage Violations',
        description: 'Buildings exceeding floor area ratio or plot coverage',
        params: [
          { key: 'max_far', label: 'Max FAR', type: 'number', default: 2.5 },
          { key: 'max_coverage', label: 'Max Coverage %', type: 'number', default: 65, unit: '%' },
        ],
        sql: (p) =>
          `SELECT b.*, p.assessment_no FROM buildings b\nJOIN land_parcels p ON\n  ST_Within(b.geom, p.geom)\nWHERE b.floor_area_ratio > ${p['max_far']}\n  OR b.plot_coverage > ${p['max_coverage']};`,
      },
      {
        id: 'building_permit',
        name: 'Building Permit Status',
        description: 'Query building applications by status and area',
        params: [
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: ['All', 'Pending', 'Approved', 'Rejected', 'Expired'],
          },
          {
            key: 'zone',
            label: 'Ward',
            type: 'select',
            options: ['All Wards', 'Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5'],
          },
        ],
        sql: (p) =>
          `SELECT * FROM building_permits\nWHERE status = '${p['status']}'\n  AND ward = '${p['zone']}'\nORDER BY application_date DESC;`,
      },
    ],
  },
  utilities: {
    label: 'Utilities & Infra',
    icon: 'build',
    color: '#f39c12',
    queries: [
      {
        id: 'water_coverage',
        name: 'Water Supply Coverage Gap',
        description: 'Properties not connected to municipal water supply',
        params: [
          {
            key: 'zone',
            label: 'GN Division',
            type: 'select',
            options: ['All Divisions', 'Colombo', 'Dehiwala', 'Moratuwa', 'Kotte'],
          },
        ],
        sql: (p) =>
          `SELECT p.* FROM land_parcels p\nLEFT JOIN water_connections w\n  ON p.assessment_no = w.assessment_no\nWHERE w.id IS NULL\n  AND p.gn_division = '${p['zone']}';`,
      },
      {
        id: 'drain_catchment',
        name: 'Drainage Catchment Analysis',
        description: 'Upstream parcels contributing to a drain outfall',
        params: [
          {
            key: 'outfall',
            label: 'Outfall Point',
            type: 'select',
            options: [
              'Outfall A - Beira',
              'Outfall B - Kelani',
              'Outfall C - Canal',
              'Outfall D - Coast',
            ],
          },
        ],
        sql: (p) =>
          `SELECT p.* FROM land_parcels p\nJOIN drainage_catchments dc\n  ON ST_Within(p.geom, dc.geom)\nWHERE dc.outfall_name = '${p['outfall']}';`,
      },
      {
        id: 'waste_service',
        name: 'Waste Collection Gaps',
        description: 'Areas beyond collection route service radius',
        params: [
          { key: 'radius', label: 'Service Radius', type: 'number', default: 200, unit: 'm' },
        ],
        sql: (p) =>
          `SELECT p.* FROM land_parcels p\nWHERE NOT EXISTS (\n  SELECT 1 FROM waste_routes w\n  WHERE ST_DWithin(p.geom, w.geom, ${p['radius']})\n);`,
      },
    ],
  },
  revenue: {
    label: 'Revenue & Tax',
    icon: 'payments',
    color: '#9b59b6',
    queries: [
      {
        id: 'outstanding_rates',
        name: 'Outstanding Rates',
        description: 'Properties with unpaid rates or taxes',
        params: [
          {
            key: 'min_arrears',
            label: 'Min Arrears (LKR)',
            type: 'number',
            default: 10000,
            unit: 'LKR',
          },
          {
            key: 'ward',
            label: 'Ward',
            type: 'select',
            options: ['All Wards', 'Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5'],
          },
        ],
        sql: (p) =>
          `SELECT p.*, r.total_arrears\nFROM land_parcels p\nJOIN rate_ledger r\n  ON p.assessment_no = r.assessment_no\nWHERE r.total_arrears > ${p['min_arrears']}\n  AND p.ward = '${p['ward']}'\nORDER BY r.total_arrears DESC;`,
      },
      {
        id: 'trade_license',
        name: 'Trade License Status',
        description: 'Commercial establishments and license compliance',
        params: [
          {
            key: 'status',
            label: 'License Status',
            type: 'select',
            options: ['All', 'Active', 'Expired', 'Not Applied', 'Suspended'],
          },
        ],
        sql: (p) =>
          `SELECT e.*, p.geom\nFROM trade_licenses e\nJOIN land_parcels p\n  ON e.assessment_no = p.assessment_no\nWHERE e.license_status = '${p['status']}';`,
      },
      {
        id: 'revenue_ward',
        name: 'Ward-wise Revenue Summary',
        description: 'Revenue collection vs arrears by ward',
        params: [
          {
            key: 'year',
            label: 'Financial Year',
            type: 'select',
            options: ['2024/2025', '2023/2024', '2022/2023', '2021/2022'],
          },
        ],
        sql: (p) =>
          `SELECT p.ward,\n  SUM(r.amount_collected) AS collected,\n  SUM(r.amount_due - r.amount_collected) AS arrears\nFROM rate_ledger r\nJOIN land_parcels p\n  ON r.assessment_no = p.assessment_no\nWHERE r.financial_year = '${p['year']}'\nGROUP BY p.ward;`,
      },
    ],
  },
  environment: {
    label: 'Environment & Health',
    icon: 'eco',
    color: '#1abc9c',
    queries: [
      {
        id: 'sensitive_zone',
        name: 'Sensitive Zone Buffer',
        description: 'Parcels within buffer of environmental zones',
        params: [
          {
            key: 'zone_type',
            label: 'Zone Type',
            type: 'select',
            options: ['Wetland', 'Forest Reserve', 'Tank Bund', 'Mangrove', 'Wildlife Corridor'],
          },
          { key: 'buffer', label: 'Buffer Distance', type: 'number', default: 50, unit: 'm' },
        ],
        sql: (p) =>
          `SELECT p.* FROM land_parcels p\nJOIN environmental_zones ez\n  ON ST_DWithin(p.geom, ez.geom, ${p['buffer']})\nWHERE ez.zone_type = '${p['zone_type']}';`,
      },
      {
        id: 'dengue_hotspot',
        name: 'Dengue Hotspot Analysis',
        description: 'Correlate dengue cases with land use patterns',
        params: [
          { key: 'radius', label: 'Cluster Radius', type: 'number', default: 250, unit: 'm' },
          {
            key: 'period',
            label: 'Period',
            type: 'select',
            options: ['Last 30 Days', 'Last 90 Days', 'Last 6 Months', 'Last Year'],
          },
        ],
        sql: (p) => {
          const interval =
            p['period'] === 'Last 30 Days'
              ? '30 days'
              : p['period'] === 'Last 90 Days'
                ? '90 days'
                : p['period'] === 'Last 6 Months'
                  ? '6 months'
                  : '1 year';
          return `SELECT p.land_use,\n  COUNT(d.id) AS cases,\n  p.geom\nFROM dengue_reports d\nJOIN land_parcels p\n  ON ST_DWithin(d.geom, p.geom, ${p['radius']})\nWHERE d.reported_date >= NOW()\n  - INTERVAL '${interval}'\nGROUP BY p.land_use, p.geom;`;
        },
      },
    ],
  },
  social: {
    label: 'Social & Services',
    icon: 'groups',
    color: '#e67e22',
    queries: [
      {
        id: 'nearest_facility',
        name: 'Nearest Public Facility',
        description: 'Find closest facility from any location',
        params: [
          {
            key: 'facility',
            label: 'Facility Type',
            type: 'select',
            options: [
              'Hospital',
              'School',
              'Playground',
              'Library',
              'Police Station',
              'Fire Station',
            ],
          },
          {
            key: 'max_dist',
            label: 'Max Distance',
            type: 'number',
            default: 1000,
            unit: 'm',
          },
        ],
        sql: (p) =>
          `SELECT f.name, f.type,\n  ST_Distance(f.geom,\n    ST_SetSRID(ST_MakePoint(lon, lat), 4326)\n  ) AS distance\nFROM public_facilities f\nWHERE f.type = '${p['facility']}'\nORDER BY distance\nLIMIT 5;`,
      },
      {
        id: 'underserved',
        name: 'Underserved Areas',
        description: 'Residential zones far from key services',
        params: [
          {
            key: 'facility',
            label: 'Service Type',
            type: 'select',
            options: ['School', 'Hospital', 'Public Transport', 'Market', 'Water Supply'],
          },
          {
            key: 'threshold',
            label: 'Min Distance',
            type: 'number',
            default: 500,
            unit: 'm',
          },
        ],
        sql: (p) =>
          `SELECT p.* FROM land_parcels p\nWHERE p.land_use = 'Residential'\n  AND NOT EXISTS (\n    SELECT 1 FROM public_facilities f\n    WHERE f.type = '${p['facility']}'\n    AND ST_DWithin(p.geom, f.geom, ${p['threshold']})\n  );`,
      },
    ],
  },
};
